import nltk
nltk.download('punkt', quiet=True)
import re
import string
import joblib
from nltk.tokenize import word_tokenize

stop_words = joblib.load('app/ml_artifacts/stopwords.pkl')

def remove_urls(text):
    pattern = re.compile(r'https?://\S+|www\.\S+')
    return pattern.sub('', text)

def remove_punc(text):
    return text.translate(str.maketrans('', '', string.punctuation))

def remove_numbers(text):
    s = ''
    for c in text:
        if c.isdigit():
            continue
        else:
            s += c
    return s

def remove_special(text):
    new = ''
    for c in text:
        if c.isascii():
            new += c
    return new

def remove_stopwords(text):
    tokens = word_tokenize(text, preserve_line=True)
    return " ".join(t for t in tokens if t not in stop_words)

def clean_text(text):
    text = text.lower()
    text = remove_urls(text)
    text = remove_punc(text)
    text = remove_numbers(text)
    text = remove_special(text)
    text = remove_stopwords(text)
    return text