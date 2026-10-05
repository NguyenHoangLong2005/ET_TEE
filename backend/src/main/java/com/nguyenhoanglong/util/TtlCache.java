package com.nguyenhoanglong.util;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

/**
 * Thread-safe in-memory cache with stale-while-revalidate semantics and an LRU
 * size cap. Built for read-heavy catalog data behind a remote database where a
 * cold load costs many seconds of network round-trips:
 * <ul>
 *   <li>fresh entry (younger than {@code freshSeconds}) is returned as-is;</li>
 *   <li>stale entry (older than that, but younger than {@code maxStaleSeconds}) is
 *       returned immediately while a single background refresh reloads it;</li>
 *   <li>missing/expired entry is loaded synchronously.</li>
 * </ul>
 */
public class TtlCache<K, V> {

    private record Slot<V>(V value, long loadedAtNanos) {}

    private static final ExecutorService REFRESHER = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "ttl-cache-refresh");
        t.setDaemon(true);
        return t;
    });

    private final long freshNanos;
    private final long maxStaleNanos;
    private final Map<K, Slot<V>> map;
    private final Set<K> refreshing = new HashSet<>();

    public TtlCache(long freshSeconds, long maxStaleSeconds, int maxEntries) {
        this.freshNanos = freshSeconds * 1_000_000_000L;
        this.maxStaleNanos = maxStaleSeconds * 1_000_000_000L;
        this.map = new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, Slot<V>> eldest) {
                return size() > maxEntries;
            }
        };
    }

    public V get(K key, Supplier<V> loader) {
        long now = System.nanoTime();
        Slot<V> slot;
        boolean startRefresh = false;
        synchronized (map) {
            slot = map.get(key);
            if (slot != null) {
                long age = now - slot.loadedAtNanos();
                if (age < freshNanos) return slot.value();
                if (age < maxStaleNanos) {
                    startRefresh = refreshing.add(key);
                } else {
                    slot = null;
                }
            }
        }
        if (slot != null) {
            if (startRefresh) {
                REFRESHER.execute(() -> {
                    try {
                        put(key, loader.get());
                    } catch (RuntimeException ignored) {
                        // keep serving the stale value; next request retries
                    } finally {
                        synchronized (map) {
                            refreshing.remove(key);
                        }
                    }
                });
            }
            return slot.value();
        }
        V value = loader.get();
        put(key, value);
        return value;
    }

    private void put(K key, V value) {
        synchronized (map) {
            map.put(key, new Slot<>(value, System.nanoTime()));
        }
    }

    public void clear() {
        synchronized (map) {
            map.clear();
        }
    }
}
