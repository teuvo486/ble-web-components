const elementName = "ble-sensor-graph";
const defaultPort = "5000";
const defaultDelay = 8;
const defaultMarginX = 20;
const defaultMarginY = 30;
const hour = 3600 * 1000;
const day = hour * 24;
const week = day * 7;

class BLESensorGraph extends HTMLDivElement {
    static register() {
        let template = document.createElement("template");
        template.setAttribute("id", `${elementName}-template`);
        document.body.appendChild(template);
        template.innerHTML = templateContent;        
        customElements.define(elementName, BLESensorGraph, { extends: "div" });  
    }
    
    constructor() {
        super();
        this.name = this.getAttribute("name");
        this.host = this.getAttribute("host") || document.location.hostname;
        this.port = this.getAttribute("port") || defaultPort;
        this.delay = (this.getAttribute("delay") || defaultDelay) * 1000;
        this.setAttribute("interval", "day");
        this.setAttribute("col", "temperature");
        let template = document.getElementById(`${elementName}-template`);
        let shadow = this.attachShadow({ mode: "open" });
        shadow.appendChild(template.content.cloneNode(true));
        this.canvas = this.shadowRoot.getElementById("canvas");
        this.shadowRoot.getElementById("graph-name").textContent = this.name;
        this.setAttribute("class", "col-auto");
        this.ctx = this.canvas.getContext("2d");
        this.minX = defaultMarginX;
        this.minY = defaultMarginY;
        this.clearError();
    }
    
    async connectedCallback() {
        try {
            await this.update();
        } catch (e) {
            this.showError(e.message);
        }
    }

    async fetch() {
        if (!this.host || !this.port || !this.name || !this.interval) {
            throw new Error("Required props not set!");
        }
        
        let res = await fetch(`http://${this.host}:${this.port}/${this.name}?start=${this.interval}`);
         
        if (res.ok) {
            return await res.json();
        } else {
            throw new Error(`${res.status} ${res.statusText}`);
        }
    }
    
    async update() {
        if (this.shadowRoot && this.isConnected) {
            this.updateAttrs();
            let dev = await this.fetch();
            
            if (dev.sensorData.length) {
                this.shadowRoot.getElementById("graph-address").textContent = dev.address;
                this.updateProps(dev.sensorData);
                this.drawGrid();
                this.drawGraph(dev.sensorData);
            }
                     
            this.clearError();   
        } 
    }

    updateAttrs() {
        this.interval = this.getAttribute("interval");
        this.col = this.getAttribute("col");
        this.maxX = this.canvas.getAttribute("width") - this.minX;
        this.maxY = this.canvas.getAttribute("height") - this.minY;
        this.rngX = this.maxX - this.minX;
        this.rngY = this.maxY - this.minY;
    }

    updateProps(data) {
        let minV = data[0][this.col];
        let maxV = minV;
        
        data.forEach(d => {
            if (d[this.col] < minV) {
                minV = d[this.col];
            } else if (d[this.col] > maxV) {
                maxV = d[this.col];
            }
        });
        
        this.maxV = Math.ceil(maxV);
        this.minV = Math.floor(minV);
        this.rngV = this.maxV - this.minV;
        let stepV = Math.round(this.rngV / 5);
        this.hLines = [];
        
        for (let y = this.minV; y <= this.maxV; y += stepV) {
            this.hLines.push(y);
        }
        
        this.minT = Date.parse(data[0].time);
        this.maxT = Date.parse(data[data.length - 1].time);
        this.rngT = this.maxT - this.minT;
        let stepT = hour * 2;
        this.vLines = [];
        
        for (let x = this.minT; x <= this.maxT; x += stepT) {
            this.vLines.push(x);
        }
    }
    
    drawGrid() {
        this.ctx.fillStyle = "lightcyan";
        this.ctx.fillRect(this.minX, this.minY, this.rngX, this.rngY);
        this.ctx.beginPath();
        this.label("°C", this.minX - 12, this.minY - 20);

        this.hLines.forEach(v => {
            this.hLine(v);
        });

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "lightblue";
        this.ctx.stroke();
        
        this.vLines.forEach(v => {
            this.vLine(v);
        });
        
        this.ctx.stroke();
    }
    
    drawGraph(data) {
        this.ctx.beginPath();
        
        data.forEach(d => {
            let x = this.calculateX(Date.parse(d.time));
            let y = this.calculateY(d[this.col]);
            this.ctx.lineTo(x, y);
        });
        
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "lightcoral";
        this.ctx.stroke();
    }

    calculateX(v) {
        return this.minX + ((v - this.minT) / this.rngT * this.rngX);
    }
    
    calculateY(v) {
        return this.maxY - ((v - this.minV) / this.rngV * this.rngY);
    }

    vLine(v) {
        let x = this.calculateX(v);
        this.ctx.moveTo(x, this.minY);
        this.ctx.lineTo(x, this.maxY);
        let d = new Date(v);
        this.label(d.toLocaleTimeString("it", { timeStyle: "short" }), x, this.maxY + 20);
    }

    hLine(v) {
        let y = this.calculateY(v);
        this.ctx.moveTo(this.minX, y);
        this.ctx.lineTo(this.maxX, y);
        this.label(v, this.minX - 12, y);
    }

    label(text, x, y) {
        let m = this.ctx.measureText(text);
        x = x - m.width / 2;
        y = y + m.actualBoundingBoxAscent / 2;
        this.ctx.fillStyle = "black";
        this.ctx.fillText(text, x, y);
    }
    
    showError(msg) {
        let error = this.shadowRoot.getElementById("error");
        error.hidden = false;
        error.textContent = msg;
    }
    
    clearError() {
        let error = this.shadowRoot.getElementById("error");
        error.hidden = true;
        error.textContent = null;
    }
}

const templateContent = `
    <link href="bootstrap/bootstrap.min.css" rel="stylesheet" integrity="sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1">
    <div class="card text-dark bg-light">
        <div class="card-header">
            <div class="row justify-content-between">
                <div class="col-auto mb-0 text-capitalize fw-bold" id="graph-name"></div>
                <div class="col-auto mb-0 text-muted" id="graph-address"></div>
            </div>
        </div>
        <div class="card-body px-1 py-1">
            <div class="alert alert-danger mb-0" id="error"></div>
            <canvas id="canvas" width=800 height=300></canvas>
        </div>
    </div>
`;

BLESensorGraph.register();

export default BLESensorGraph;
