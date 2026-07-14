# emotions dataset from kaggle train.txt

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score


df = pd.read_csv("train.txt", sep=';', header=None, names=["text", "emotion"])

# print(df.head())

# converting emotions into numeric
# check how many emotions
unique_emotions = df['emotion'].unique()
emotion_numbers = {}
i = 0
for emo in unique_emotions:
    emotion_numbers[emo] = i
    i += 1

df['emotion'] = df['emotion'].map(emotion_numbers)

# turn text to lowercase
df['text'] = df['text'].apply(lambda x : x.lower())

# remove punctuations
import string
def remove_punc(text):
    return text.translate(str.maketrans('', '', string.punctuation))

df['text'] = df['text'].apply(remove_punc)

# remove numbers
def remove_numbers(text):
    s = ''
    for c in text:
        if c.isdigit():
            continue
        else:
            s += c
    return s

df['text'] = df['text'].apply(remove_numbers)

# remove URLs and links

# remove emojis and special characters
def remove_special(text):
    new = ''
    for c in text:
        if c.isascii():
            new += c
    return new

df['text'] = df['text'].apply(remove_special)

# corpus - whole collection eg folder of 10000 tweets
# sentence - group of words that form meaningful statement
# token - each individual word or symbol
# splitting into tokens is called tokenization
# remove stopwords use NLTK or spaCy
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# we have to download these once
nltk.download('punkt') # punkt is a library used for tokenization
nltk.download('stopwords') # download all stopwords

stop_words = set(stopwords.words('english'))
print(len(stop_words))

#this is how i tokenized
# s = df.loc[0, 'text']
# arr = word_tokenize(s, 'english', preserve_line=True)
# print(arr)

def removesw(text):
    word = []
    tokens = word_tokenize(text, 'english', preserve_line=True)
    for token in tokens:
        if token not in stop_words:
            word.append(token)
    return " ".join(word)

df['text'] = df['text'].apply(removesw)

print(df.loc[1, 'text'])

from sklearn.model_selection import train_test_split

xtrain, xtest, ytrain, ytest = train_test_split(df['text'], df['emotion'], test_size=0.20, random_state=42)

# print(xtrain)

from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
bow = CountVectorizer()
x_train_bow = bow.fit_transform(xtrain)

tfidf = TfidfVectorizer()
x_train_tf = tfidf.fit_transform(xtrain)

from sklearn.naive_bayes import MultinomialNB
# best for words and discrete data or frequencies
nbc = MultinomialNB()
nbc.fit(x_train_bow, ytrain)

x_test_bow = bow.transform(xtest)

ansbow = nbc.predict(x_test_bow)
print(ansbow)
print("Accuracy score of bow: ", accuracy_score(ansbow, ytest))

from sklearn.linear_model import LogisticRegression
lr = LogisticRegression(max_iter=1000)
lr.fit(x_train_tf, ytrain)

x_test_tf = tfidf.transform(xtest)
anstf = lr.predict(x_test_tf)
print(anstf)
print("Accuracy score of tfidf: ", accuracy_score(anstf, ytest))

import re
def remove_urls(text):
    pattern = re.compile(r'https?://\S+|www\.\S+')
    return pattern.sub('', text)

# sentence = input("Your sentence: ")
# sentence = remove_special(remove_urls(remove_numbers(remove_punc(sentence.lower()))))
# sentence = removesw(sentence)
# tfsentence = tfidf.transform([sentence])
#
# ans = lr.predict(tfsentence)
#
# print("Your emotion: ", unique_emotions[ans[0]])
import joblib
joblib.dump(lr, 'app/ml_artifacts/model.pkl')
joblib.dump(tfidf, 'app/ml_artifacts/tfidf.pkl')
joblib.dump(unique_emotions, 'app/ml_artifacts/emotions.pkl')
joblib.dump(stop_words, 'app/ml_artifacts/stopwords.pkl')
print("Artifacts saved successfully!")