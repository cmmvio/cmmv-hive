from phe import paillier
import base64
import json

def generate_keys():
    """Gera par de chaves pública/privada"""
    public_key, private_key = paillier.generate_paillier_keypair()
    return public_key, private_key

def encrypt_vote(vote: str, public_key):
    """Encripta votos usando criptografia homomórfica"""
    vote_int = int.from_bytes(vote.encode('utf-8'), 'big')
    encrypted = public_key.encrypt(vote_int)
    return {
        'ciphertext': str(encrypted.ciphertext()),
        'exponent': encrypted.exponent
    }

def decrypt_vote(encrypted_data, private_key):
    """Decripta votos usando chave privada"""
    ciphertext = int(encrypted_data['ciphertext'])
    exponent = int(encrypted_data['exponent'])
    encrypted = paillier.EncryptedNumber(public_key, ciphertext, exponent)
    decrypted = private_key.decrypt(encrypted)
    return decrypted.to_bytes((decrypted.bit_length() + 7) // 8, 'big').decode()