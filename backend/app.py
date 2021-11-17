import os
import sqlite3

from flask import Flask
from flask import abort
from flask import g
from flask import jsonify
from flask import request

from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(
                "emr.db",
                detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row

    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)

    if db is not None:
        db.close()

@app.route("/search", methods=["GET"])
def search():
    db = get_db()
    cursor = db.cursor()

    request_args = dict(request.args)
    if "name" in request.args:
        request_args["name"] = "%" + request.args["name"] + "%"

    select_sql = """SELECT a.name || b.name || c.name AS full_name
                    FROM last_name AS a, given_name AS b, given_name AS c
                    WHERE full_name LIKE '%:name%';"""

    cursor.execute(select_sql, request_args)

    search_name = [sha256(dict(row)["full_name"].encode()).hexdigest()
                   for row in cursor.fetchall()]

@app.route("/post/<idx>", methods=["POST"])
def post(idx):
    db = get_db()
    cursor = db.cursor()

    insert_sql = """INSERT INTO emr(
                    idx,
                    hospital_code,
                    hospital_name,
                    emr_no,
                    personal_id,
                    fullname,
                    birth,
                    blood_type,
                    rh_blood_type,
                    insurance)
                    VALUES(
                    :idx,
                    :hospital_code,
                    :hospital_name,
                    :emr_no,
                    :personal_id,
                    :fullname,
                    :birth,
                    :blood_type,
                    :rh_blood_type,
                    :insurance);"""

    row = dict(request.form)
    row["idx"] = idx

    cursor.execute(insert_sql, row)
    db.commit()

    return "done"

@app.route("/get/<idx>")
def get(idx):
    db = get_db()
    cursor = db.cursor()
    
    select_sql = "SELECT * FROM emr WHERE idx LIKE (?);"
    print(idx)
    cursor.execute(select_sql, (idx,))
    row = dict(cursor.fetchone())
    row.pop("idx", None)
    return (jsonify(row), 200,
        {'Content-Type': 'application/json'})
    

if __name__ == "__main__":
    app.debug = False
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)


