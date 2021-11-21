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
                "bank_account.db",
                detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row

    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)

    if db is not None:
        db.close()

@app.route("/post/<idx>", methods=["POST"])
def post(idx):
    db = get_db()
    cursor = db.cursor()

    insert_sql = """INSERT INTO bank_account(
                    idx,
                    bank_code,
                    bank_name,
                    account_no,
                    personal_id,
                    fullname,
                    birth,
                    securities,
                    foreign_currency)
                    VALUES(
                    :idx,
                    :bank_code,
                    :bank_name,
                    :account_no,
                    :personal_id,
                    :fullname,
                    :birth,
                    :securities,
                    :foreign);"""

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


