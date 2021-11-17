
//set up event listener for buttons
window.onload = function(){
    document.getElementById('submit').addEventListener('click', on_submit);
    document.getElementById('dec_submit').addEventListener(
        'click', on_dec_submit);
    document.getElementById('upload_enc_btn').addEventListener(
        'click', function(){document.getElementById('upload_enc').click();});
    /*document.getElementById('upload_dec_btn').addEventListener(
        'click', function(){document.getElementById('upload_dec').click();});*/
    document.getElementById('import_btn').addEventListener(
        'click', function(){document.getElementById('import').click();});
    document.getElementById('export_btn').addEventListener(
        'click', function(){document.getElementById('export').click();});
    document.getElementById('get_url_submit').addEventListener(
        'click', on_get_url_submit);
        
}

function on_submit() {
    var form_data = new FormData(document.getElementById("form"));
    var data = {};
    form_data.forEach((value, key) => data[key] = value);
    
    var file = document.getElementById('upload_enc').files[0];
    if(typeof file !== 'undefined') {
        var reader = new FileReader();
        reader.onload = function(event){
            console.log(reader.result);
            var enc_data = cipher.encrypt(JSON.parse(reader.result));
            post_to_url(enc_data, data.post_url);
            document.getElementById("enc").innerHTML = "encrypted:\n"
                + JSON.stringify(enc_data, null, 2);
        };
        reader.readAsText(file);
        return;
    }

    var enc_data = cipher.encrypt(data);
    post_to_url(enc_data, data.post_url);
    document.getElementById("enc").innerHTML = "encrypted:\n"
        + JSON.stringify(enc_data, null, 2);
}

function on_dec_submit() {
    var form_data = new FormData(document.getElementById("dec_form"));
    var data = {};
    form_data.forEach((value, key) => data[key] = value);
    var json_obj = JSON.parse(data.json);

    var import_file = document.getElementById('import').files[0];
    if(typeof import_file !== 'undefined') {
        var reader = new FileReader();
        reader.onload = function(event){
            var dec_data = cipher.decrypt(json_obj, JSON.parse(reader.result));
        };
        reader.readAsText(import_file);
        return;
    }
    var dec_data = cipher.decrypt(json_obj);
}

function on_get_url_submit() {
    var url = document.getElementById("get_url").value;
    
    var request = new XMLHttpRequest();
    request.responseType = "json";
    request.open("GET", url);
    request.send(null);
    request.onreadystatechange = () => {
        if(request.readyState === 4 && request.status === 200) {
            document.getElementById("encrypt_json").value = JSON.stringify(
                request.response, null, 2);
        }
    };
}
