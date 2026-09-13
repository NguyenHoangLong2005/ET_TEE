import sqlite3, base64
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher
from cryptography.hazmat.primitives.ciphers.algorithms import AES
from cryptography.hazmat.decrepit.ciphers.modes import CFB8

enc = '756d577545525a72384477722b66306b4e4d614c64344a65706c3363706d356552773d3d'
key = 'NOAM4DmQP1fUxCcG'

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

print(decrypt(enc, key).decode('utf-8', errors='replace'))
