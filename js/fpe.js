/*
the EMR FPE chrome extension
FPE cipher
*/
"use strict";

/*
for testing
should use PBKDF or randomly generate instead
*/
const key = "EF4359D8D580AA4F7F036D6F04FC6A94"
const tweak = "D8E7920AFA330A73"
var test_obj;

//encrypt and decrypt IDs and preseve formats
var id_cipher = {
    create: function(key, tweak) {
        var self = Object.create(this);
        self.cipher_36 = new window.FF3_Cipher(key, tweak, 36);
        self.cipher_10 = new window.FF3_Cipher(key, tweak);
        return self;
    },
    encrypt_once: function(plaintext) {
        /*
        use base 36 because of first alphabet
        need to split IDs into two chunks id[0:4) and id[4:]
        to match the requirement of FF3 algorithm in MIN_RANGE=10^6
        range size will be 36^4 and 10^6 
        */
        //encrypt with FF3 base 36 and base 10 and concat them
        var ciphertext = this.cipher_36.encrypt(plaintext.substr(0,4))
            + this.cipher_10.encrypt(plaintext.substr(4));
        return ciphertext;
    },
    decrypt_once: function(ciphertext) {
        var plaintext = this.cipher_36.decrypt(ciphertext.substr(0,4))
            + this.cipher_10.decrypt(ciphertext.substr(4));
        return plaintext;
    },
    lookup_table: {
        //for step 1 in sanity check of IDs
        //ref: http://120.105.184.250/peiyuli/lesson-40.htm
        "a": "10", "b": "11", "c": "12", "d": "13", "e": "14",
        "f": "15", "g": "16", "h": "17", "i": "34", "j": "18",
        "k": "19", "l": "20", "m": "21", "n": "22", "o": "35",
        "p": "23", "q": "24", "r": "25", "s": "26", "t": "27",
        "u": "28", "v": "29", "w": "32", "x": "30", "y": "31",
        "z": "33"
    },
    check_id: function(personal_id) {
        //format check of IDs
        var re = /^[a-z][1-2]\d{8}$/;
        if (!re.test(personal_id))
            return false;
        //sanity check of IDs
        /*
        ref: http://120.105.184.250/peiyuli/lesson-40.htm
        Algo:
        Step 1: change alphabet into two digits and concat with remain digits
        Step 2: form 11 digits into 11 numbers
        Step 3: multiply 11 number in 1 9 8 7 6 5 4 3 2 1 1, respectively.
        Step 4: sum them all and test if it divided by 10
        */
        //Step 1
        var numeric_str = this.lookup_table[personal_id[0]]
            + personal_id.substr(1);
        //Step 2
        var numbers = Array.from(numeric_str.substr(1)).map((d)=>parseInt(d));
        //Step 3 + Step 4
        var reducer = (acc, cur, idx) => acc + numbers[idx] * cur;
        var init_val = parseInt(numeric_str[0])
            + parseInt(numeric_str[numeric_str.length - 1]);
        //dirty hack to generate 1 to 9 and reverse it
        var weighted_sum = Array.from(
            numbers.keys()).reverse().reduce(reducer, init_val);
        return weighted_sum % 10 === 0;
    },
    encrypt: function(plaintext) {
        if (!this.check_id(plaintext.toLowerCase())) {
            throw ("not a valid personal id");
        }
        
        var ciphertext = this.encrypt_once(plaintext.toLowerCase());
        //cycle-walking
        while (!this.check_id(ciphertext)) {
            ciphertext = this.encrypt_once(ciphertext);
        }
        return ciphertext.toUpperCase();
    },
    decrypt: function(ciphertext) {
        if (!this.check_id(ciphertext.toLowerCase())) {
            throw ("not a valid personal id");
        }
        
        var plaintext = this.decrypt_once(ciphertext.toLowerCase());
        //cycle-walking
        while (!this.check_id(plaintext)) {
            plaintext = this.decrypt_once(plaintext);
        }
        return plaintext.toUpperCase();
    },
    rekey: function(key, tweak) {
        this.cipher_36.rekey(key, tweak);
        this.cipher_10.rekey(key, tweak);
    }
};

/*
basic integer FPE
consider change it to FFSEM instead
will be slow when input range is sufficiently large
don't use it if range of input is greater than 10^6
*/
var prefix_cipher = {
    create: function(key) {
        var self = Object.create(this);
        self.key = CryptoJS.enc.Hex.parse(key);
        /*
        AES ECB modes because not use ciphertext directly
        and we need a determistic result for it
        also for better performance
        */
        self.aes_cipher = {
            encrypt: (plaintext) => CryptoJS.AES.encrypt(plaintext, self.key,
                {mode: CryptoJS.mode.ECB}).toString(),
            decrypt: (ciphertext) => CryptoJS.AES.decrypt(ciphertext, self.key,
                {mode: CryptoJS.mode.ECB}).toString(CryptoJS.enc.Utf8)
        };
        return self;
    },
    /*
    use AES to get pesudo random values then sort it
    index of input as ciphertext
    Example:
        AES(0, k) = 3FFFFF......
        AES(1, k) = 1FFFFF......
        AES(2, k) = 0FFFFF......
        AES(3, k) = 2FFFFF......
        Enc_prefix(k) = {0, 1, 2, 3} --> {3, 1, 0, 2}
        Enc_prefix(2, k) = 0
    */
    encrypt: function(rank, domain_size) {
        var weights = Array.from(Array(domain_size).keys()).map(
            (d)=>this.aes_cipher.encrypt(d.toString())).sort();
        return weights.indexOf(this.aes_cipher.encrypt(rank.toString()))
    },
    //do same thing when encrypt and also decrypt value at rank
    decrypt: function(rank, domain_size) {
        var weights = Array.from(Array(domain_size).keys()).map(
            (d)=>this.aes_cipher.encrypt(d.toString())).sort();
        return parseInt(this.aes_cipher.decrypt(weights[rank]))
    },
    rekey: function(key) {
        this.key = CryptoJS.enc.Hex.parse(key);
    }
};

/*
generate key and tweaks
may be insecure, consider using KDF specify by NIST instead
*/
var key_generator = {
    create: function(key, tweak) {
        var self = Object.create(this);
        self.last = key + tweak;
        self.hashes = [];
        return self;
    },
    generate: function(num) {
        var hashes = Array(num - this.hashes.length);
        for (let i = 0; i < num - this.hashes.length; i++) {
            this.last = CryptoJS.SHA256(this.last).toString();
            hashes[i] = this.last;
        }
        this.hashes.push(...hashes.map(
            (e) => ({key: e.substr(0, 32), tweak: e.substr(32, 16)})));
    },
    get: function(idx) {
        if(idx > this.hashes.length - 1) {
            this.generate(idx + 1);
        }
        return this.hashes[idx];
    }
};
//encrpt whole emr
var emr_cipher = {
    blood_types: ["A", "B", "O", "AB"],
    rh_blood_types: ["P", "N"],
    insurances: ["T", "F"],
    create: function(key, tweak) {
        var self = Object.create(this);
        self.tables = {};
        self.read_tables();
        self.id_cipher = id_cipher.create(key, tweak);
        self.prefix_cipher = prefix_cipher.create(key);
        self.ff3_cipher = new window.FF3_Cipher(key, tweak);
        self.key_generator = key_generator.create(key, tweak);
        self.idx = 0;
        return self;
    },
    //return a promise to read table
    //but resolve it in read tables
    read_table: function(table_name) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get([table_name], (result) => {
                if(typeof result[table_name] !== "undefined") {
                    resolve(result[table_name]);
                }
                else {
                    var file = new XMLHttpRequest();
                    file.open("GET"
                        , chrome.runtime.getURL("data/" + table_name + ".txt"), true);
                    file.onreadystatechange = () => {
                        if(file.readyState === 4) {
                            if(file.status === 200 || file.status === 0) {
                                var text = file.responseText.split('\n');
                                resolve(text);       
                            }
                        }
                    };
                    file.send(null);
                }
            });
        });
    },
    //resolve promise here
    read_tables: async function() {
        var table_names = ["bank_names", "bank_codes"
            , "last_names", "given_names"];
        await Promise.all(table_names.map((e)=>this.read_table(e))).then(v => {
            table_names.forEach((name, i) => {
                this.tables[name] = v[i];
            });
        });
        //initialize hospital select in html
        var select = document.getElementById('bank_code');
        cipher.tables["bank_names"].forEach((e, i) => {
            var opt = document.createElement('option');
            opt.value = cipher.tables["bank_codes"][i];
            opt.innerHTML = e;
            select.appendChild(opt);
        });
    },
    rekey: function(key, tweak) {
        this.id_cipher.rekey(key, tweak);
        this.prefix_cipher.rekey(key);
        this.ff3_cipher.rekey(key, tweak);
    },
    encrypt_id: function(personal_id) {
        return this.id_cipher.encrypt(personal_id);
    },
    decrypt_id: function(personal_id) {
        return this.id_cipher.decrypt(personal_id);
    },
    /*
    encrypt birth and make sure result will be after 1900/01/01
    and before current date
    change problem to integer FPE
    */
    encrypt_birth: function(birth) {
        var today = new Date();
        var today_str = today.toISOString();
        //javascript month January is 0
        var rank = date_diff_in_days(new Date(1900, 0, 1), new Date(birth));
        var domain_size = date_diff_in_days(new Date(1900, 0, 1), new Date());
        var enc_rank = this.prefix_cipher.encrypt(rank, domain_size);
        var enc_birth = (new Date(Date.UTC(1900,0,1)
            + enc_rank * _MS_PER_DAY)).toISOString();
        return {
            //get rid of unwanted time in ISO format
            birth: enc_birth.substr(0, enc_birth.indexOf("T")),
            today: today_str.substr(0, today_str.indexOf("T"))
        };
    },
    decrypt_birth: function(birth, today) {
        var today = Date(today);
        //javascript month January is 0
        var rank = date_diff_in_days(new Date(1900, 0, 1), new Date(birth));
        var domain_size = date_diff_in_days(new Date(1900, 0, 1), new Date());
        var dec_rank = this.prefix_cipher.decrypt(rank, domain_size);
        var dec_birth = (new Date(Date.UTC(1900,0,1)
            + dec_rank * _MS_PER_DAY)).toISOString();
        //get rid of unwanted time in ISO format
        return dec_birth.substr(0, dec_birth.indexOf("T"));
    },
    encrypt_given_name: function(given_name) {
        //update table if not exist
        this.tables["given_names"].push(
            ...Array.from(given_name).filter(
                (e) => this.tables["given_names"].indexOf(e) === -1));
        //change problem to integer FPE
        var idx = Array.from(given_name).map(
            (e)=>this.tables["given_names"].indexOf(e));
        var enc_idx = Array.from(idx).map(
            (e)=>this.prefix_cipher.encrypt(
                e, this.tables["given_names"].length));
        return {
            given_name: enc_idx.map(
                (e) => this.tables["given_names"][e]).join(""),
            table_length: this.tables["given_names"].length
        };
    },
    decrypt_given_name: function(given_name, table_length) {
        //change problem to integer FPE
        var idx = Array.from(given_name).map(
            (e)=>this.tables["given_names"].indexOf(e));
        var dec_idx = Array.from(idx).map(
            (e)=>this.prefix_cipher.decrypt(
                e, table_length));
        return dec_idx.map((e)=>this.tables["given_names"][e]).join("");
    },
    encrypt_last_name: function(last_name) {
        //update table if not exist
        if(this.tables["last_names"].indexOf(last_name) === -1) {
            this.tables["last_names"].push(last_name);
        }
        //change problem to integer FPE
        var idx = this.tables["last_names"].indexOf(last_name);
        var enc_idx = this.prefix_cipher.encrypt(
            idx, this.tables["last_names"].length);
        return {
            last_name: this.tables["last_names"][enc_idx],
            table_length: this.tables["last_names"].length
        };
    },
    decrypt_last_name: function(last_name, table_length) {
        //change problem to integer FPE
        var idx = this.tables["last_names"].indexOf(last_name);
        var dec_idx = this.prefix_cipher.decrypt(
            idx, table_length);
        return this.tables["last_names"][dec_idx];
    },
    //for tables don't need update
    encrypt_from_table: function(entry, table_name) {
        var idx = this.tables[table_name].indexOf(entry);
        var enc_idx = this.prefix_cipher.encrypt(
            idx, this.tables[table_name].length);
        return this.tables[table_name][enc_idx];
    },
    //for tables don't need update
    decrypt_from_table: function(entry, table_name) {
        var idx = this.tables[table_name].indexOf(entry);
        var dec_idx = this.prefix_cipher.decrypt(
            idx, this.tables[table_name].length);
        return this.tables[table_name][dec_idx];
    },
    encrypt_emr_no: function(emr_no) {
        return this.ff3_cipher.encrypt(emr_no);
    },
    decrypt_emr_no: function(emr_no) {
        return this.ff3_cipher.decrypt(emr_no);
    },
    //map each combination in to numbers
    //integer FPE
    encrypt_others: function(blood_type, rh_blood_type, insurance) {
        var blood_idx = this.blood_types.indexOf(blood_type);
        var rh_idx = this.rh_blood_types.indexOf(rh_blood_type);
        var insurance_idx = this.insurances.indexOf(insurance);

        var idx = blood_idx + rh_idx * 4 + insurance_idx * 8;
        var enc_idx = this.prefix_cipher.encrypt(idx, 16);

        return {
            blood_type: this.blood_types[enc_idx % 4],
            rh_blood_type: this.rh_blood_types[Math.floor((enc_idx % 8) / 4)],
            insurance: this.insurances[Math.floor(enc_idx / 8)]
        };
    },
    //map each combination in to numbers
    //integer FPE
    decrypt_others: function(blood_type, rh_blood_type, insurance) {
        var blood_idx = this.blood_types.indexOf(blood_type);
        var rh_idx = this.rh_blood_types.indexOf(rh_blood_type);
        var insurance_idx = this.insurances.indexOf(insurance);

        var idx = blood_idx + rh_idx * 4 + insurance_idx * 8;
        var dec_idx = this.prefix_cipher.decrypt(idx, 16);

        return {
            blood_type: this.blood_types[dec_idx % 4],
            rh_blood_type: this.rh_blood_types[Math.floor((dec_idx % 8) / 4)],
            insurance: this.insurances[Math.floor(dec_idx / 8)]
        };
    },
    get_bank_name: function(bank_code) {
        var idx = this.tables["bank_codes"].indexOf(bank_code);
        return this.tables["bank_names"][idx];
    },
    save_stroage: function(data, helper_obj, is_saved) {
        if(is_saved) {
            var json_str = JSON.stringify(data);
            var hash = CryptoJS.SHA256(json_str).toString();
            chrome.storage.sync.set({[hash]: helper_obj}, function() {
              console.log("chrome sync save helper object");
            });
        }
        
        chrome.storage.sync.set({"index": this.idx}, function() {
          console.log("chrome sync save index");
        });

        var table_names = ["last_names", "given_names"];
        table_names.forEach((e)=>{
            chrome.storage.sync.set({[e]: this.tables[e]}, function() {
              console.log("chrome sync %s", e);
            });
        });
    },
    decrypt_cb: function(entry, helper_obj) {
        var key = helper_obj.key;
        this.rekey(key.key, key.tweak);

        entry["name"] = split_name(entry["fullname"]);

        var dec_bank_code = this.decrypt_from_table(
            entry.bank_code, "bank_codes");
        var dec_others = this.decrypt_others(
            entry.blood_type, entry.rh_blood_type, entry.insurance);

        var data = {
            bank_code: dec_bank_code,
            bank_name: this.get_bank_name(dec_bank_code),
            emr_no: this.decrypt_emr_no(entry.emr_no),
            personal_id: this.decrypt_id(entry.personal_id),
            fullname: this.decrypt_last_name(
                    entry.name.last_name, helper_obj.last_name_table_length)
                + this.decrypt_given_name(
                    entry.name.given_name, helper_obj.given_name_table_length),
            birth: this.decrypt_birth(entry.birth, helper_obj.today)
        };
        Object.keys(dec_others).forEach((e) => data[e] = dec_others[e]);
        return data;
    },
    encrypt: function(entry) {
        this.idx++;
        var key = this.key_generator.get(this.idx);
        this.rekey(key.key, key.tweak);

        entry["name"] = split_name(entry["fullname"]);

        var enc_bank_code = this.encrypt_from_table(
            entry.bank_code, "bank_codes");
        var enc_birth = this.encrypt_birth(entry.birth);
        var enc_others = this.encrypt_others(
            entry.blood_type, entry.rh_blood_type, entry.insurance);
        var enc_given_name = this.encrypt_given_name(entry.name.given_name);
        var enc_last_name = this.encrypt_last_name(entry.name.last_name);

        var data = {
            bank_code: enc_bank_code,
            bank_name: this.get_bank_name(enc_bank_code),
            emr_no: this.encrypt_emr_no(entry.emr_no),
            personal_id: this.encrypt_id(entry.personal_id),
            fullname: enc_last_name.last_name + enc_given_name.given_name,
            birth: enc_birth.birth
        };
        var helper_obj = {
            key: key,
            today: enc_birth.today,
            given_name_table_length: enc_given_name.table_length,
            last_name_table_length: enc_last_name.table_length
        }
        Object.keys(enc_others).forEach((e) => data[e] = enc_others[e]);

        this.save_stroage(data, helper_obj,
            entry.hasOwnProperty("save_check_box"));

        //feature for exproting helper object
        //stringify for pretty json
        document.getElementById("export").href = 
            "data:application/octet-stream;charset=utf-8;base64,"
            + btoa(JSON.stringify(helper_obj, null, 2));

        document.getElementById("export_btn").style.display = "block";
        return data;
    },
    decrypt: function(entry, helper_obj) {
        var json_str = JSON.stringify(entry);
        var hash = CryptoJS.SHA256(json_str).toString();
        chrome.storage.sync.get([hash], (result) => {
            var helper = helper_obj ? helper_obj : result[hash];
            if(typeof helper !== "undefined") {
                var dec_data = this.decrypt_cb(entry, helper);
                document.getElementById("dec").innerHTML = "decrypted:\n"
                    + JSON.stringify(dec_data, null, 2);
                return;
            }
            document.getElementById("dec").innerHTML = "Cannot decrypt!";
        });
    }
};

var cipher = emr_cipher.create(key, tweak);
//initialize index
chrome.storage.sync.get(["index"], (result) => {
    if(typeof result.index !== 'undefined') {
        cipher.idx = result.index;
    }
});
