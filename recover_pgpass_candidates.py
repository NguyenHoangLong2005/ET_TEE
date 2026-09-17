import sqlite3, base64, os
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher
from cryptography.hazmat.primitives.ciphers.algorithms import AES
from cryptography.hazmat.decrepit.ciphers.modes import CFB8

DB = r'C:\Users\DELL\AppData\Roaming\pgAdmin\pgadmin4.db'
enc = None
keys = []

conn = sqlite3.connect('file:' + DB + '?mode=ro', uri=True)
cur = conn.cursor()
enc = cur.execute("select password from server where id=1").fetchone()[0]
keys = cur.execute("select name, value from keys").fetchall()
cur.close()
conn.close()

keys.append(('master_key', 'NOAM4DmQP1fUxCcG'))
keys.append(('master_key_utf8', 'NOAM4DmQP1fUxCcG'.encode('utf-8')))

print('encrypted length', len(enc))
print('keys count', len(keys))


def pad(key):
    if isinstance(key, str):
        key = key.encode()
    key = key[:32]
    if len(key) in (16, 24, 32):
        return key
    return key.ljust(32, b'}')


def decrypt(ciphertext, key):
    ciphertext = base64.b64decode(ciphertext)
    iv = ciphertext[:16]
    cipher = Cipher(AES(pad(key)), CFB8(iv), default_backend())
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext[16:]) + decryptor.finalize()

seen = set()
for name, value in keys:
    candidates = []
    if isinstance(value, str):
        candidates.append(('raw', value.encode('utf-8')))
        try:
            decoded = base64.b64decode(value)
            if decoded:
                candidates.append(('decoded', decoded))
        except Exception:
            pass
    elif isinstance(value, bytes):
        candidates.append(('rawbytes', value))
        try:
            candidates.append(('decoded', base64.b64decode(value)))
        except Exception:
            pass
    for label, key in candidates:
        k = key
        if isinstance(k, memoryview):
            k = k.tobytes()
        keyrepr = k[:64]
        sig = (name, label, keyrepr)
        if sig in seen:
            continue
        seen.add(sig)
        try:
            out = decrypt(enc, k)
            print('TRY', name, label, 'len', len(k), 'result_prefix', out[:80])
            try:
                txt = out.decode('utf-8')
                print('TEXT', txt)
            except Exception:
                pass
        except Exception as e:
            print('FAIL', name, label, 'error', type(e).__name__, e)
        print('---')
