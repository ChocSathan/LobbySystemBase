import csv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Initialiser l'application FastAPI
app = FastAPI()

class User(BaseModel):
    id: str
    username: str
    lobby: str
    role: str

@app.post("/create_user")
def create_user(user: User, file_path="users.csv"):
    instance_data = [user.id, user.username, user.lobby, user.role]
    with open(file_path, mode='a', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(instance_data)
    return {"result": None}

@app.post("/get_user_data")
def get_user_data(user: User, file_path="users.csv"):
    with open(file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        next(reader, None)
        for row in reader:
            if row[0] == str(user.id):
                return {"result": {
                    "id": row[0],
                    "username": row[1],
                    "lobby": row[2],
                    "role": row[3]
                }}

    return {"result": "User Not Found"}

@app.post("/get_user_lobby")
def get_user_lobby(user: User, file_path="users.csv"):
    users = []
    with open(file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        for row in reader:
            if row[2] == user.lobby:
                users.append((row[1],row[3]))
    return {"result": users}

@app.post("/get_user_role")
def get_user_role(user: User, file_path="users.csv"):
    users = []
    with open(file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        for row in reader:
            if row[3] == user.role:
                users.append(row)
    return {"result": users}

@app.post("/update_user")
def update_user(user: User, file_path="users.csv"):
    instance_data = [user.id, user.username, user.lobby, user.role]
    with open(file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        rows = list(reader)
    with open(file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        for row in rows:
            if row[0] == user.id:
                writer.writerow(instance_data)
            else:
                writer.writerow(row)
    return {"result": None}

@app.post("/remove_user")
def remove_user(user: User, file_path="users.csv"):
    with open(file_path, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.reader(file)
        rows = list(reader)
    with open(file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        for row in rows:
            if row[0] != user.id:
                writer.writerow(row)
    return {"result": None}

@app.post("/clear_csv")
def clear_csv(file_path="users.csv"):
    with open(file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["id", "username", "lobby", "role"])
    return {"result": None}

@app.post("/check_lobby_exists")
def check_lobby_exists(user: User, file_path="users.csv"):
    with open(file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        for row in reader:
            if row[2] == user.lobby:
                return {"exists": True}
    return {"exists": False}