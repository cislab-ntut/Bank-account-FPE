const _MS_PER_DAY = 1000 * 60 * 60 * 24;

// a and b are javascript Date objects
function date_diff_in_days(a, b) {
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function split_name(name) {
    if(name.length === 4) {
        return {
            last_name: name.substr(0,2),
            given_name: name.substr(2)
        };
    }
    return {
        last_name: name.substr(0,1),
        given_name: name.substr(1)
    };
}

function post_to_url(obj, url) {
    if(url === "") {
        return;
    }

    var form_data = new FormData();
    Object.keys(obj).forEach(key => form_data.append(key, obj[key]));

    var request = new XMLHttpRequest();
    request.open("POST", url);
    request.send(form_data);
    request.onreadystatechange = () => {
        if(request.readyState === 4 && request.status === 200) {
            console.log("post success");
        }
    };
}
