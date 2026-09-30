import jwt
import datetime

secret = 'dGhpc2lzYXZlcnlsb25nc2VjcmV0a2V5dGhhdGlzMjU2Yml0c2xvbmc='
import base64
# wait, spring boot io.jsonwebtoken uses the secret as bytes or base64 decoded?
# usually if it's base64 encoded string, the secret bytes are base64 decoded first, OR used as is.
# let's just use it as string if it's jjwt.

# Let's generate both and see which works.
import urllib.request

def try_token(token):
    try:
        req = urllib.request.Request('http://localhost:8081/api/admin/rbac/roles', headers={'Authorization': 'Bearer ' + token})
        res = urllib.request.urlopen(req)
        print("Success:", res.read().decode()[:100])
        return True
    except urllib.error.HTTPError as e:
        print("HTTPError:", e.code)
    except Exception as e:
        print("Error:", e)
    return False

# Attempt 1: decoded bytes
key = base64.b64decode(secret)
token = jwt.encode({
    'sub': 'admin@et.tee',
    'role': 'ADMIN',
    'iat': datetime.datetime.utcnow(),
    'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
}, key, algorithm='HS256')
if try_token(token): exit(0)

# Attempt 2: raw string
token = jwt.encode({
    'sub': 'admin@et.tee',
    'role': 'ADMIN',
    'iat': datetime.datetime.utcnow(),
    'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
}, secret, algorithm='HS256')
try_token(token)
