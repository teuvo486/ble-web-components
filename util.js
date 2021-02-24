const HOST = "192.168.2.231";
const PORT = "5000";

async function fetchAll() {
    let res = await fetch(`http://${HOST}:${PORT}`);
    
    if (res.ok) {
        return await res.json();
    } else {
        throw new Error(`Error: ${res.status} ${res.statusText}`);
    }
}

async function fetchOne(name) {
    let res = await fetch(`http://${HOST}:${PORT}/${name}`);
      
    if (res.ok) {
        return await res.json();
    } else {
        throw new Error(`Error: ${res.status} ${res.statusText}`);
    }
}

async function registerTemplate(id, path) {
    if (!document.getElementById(id)) {
        let res = await fetch(path);
          
        if (res.ok) {
            let html = await res.text();
            let template = document.createElement("template");
            template.setAttribute("id", id);
            document.body.appendChild(template);
            template.innerHTML = html;
        } else {
            throw new Error(`Error: ${res.status} ${res.statusText}`);
        }
    }
}

function displayError(msg) {
    let errors = document.getElementById("errors");
    let error = document.createElement("div");
    error.setAttribute("class", "alert alert-danger");
    error.textContent = msg;
    errors.appendChild(error);
}

export {
    fetchAll, 
    fetchOne,
    registerTemplate,
    displayError,
};
