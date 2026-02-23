import os
import time

class CacheManager:
    def __init__(self, filename="cached-response.txt", expire_seconds=300):
        self.filename = filename
        self.expire_seconds = expire_seconds

    def get(self):
        if not os.path.exists(self.filename):
            return None
        
        file_age = time.time() - os.path.getmtime(self.filename)
        if file_age > self.expire_seconds:
            return None

        with open(self.filename, "r", encoding="utf-8") as file:
            return file.read()

    def set(self, data):
        with open(self.filename, "w", encoding="utf-8") as file:
            file.write(data)