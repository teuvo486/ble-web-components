How to embed
------------

Put the component files somewhere under your web root (/var/www/html by default on Ubuntu) 
and add something like the following to your web page:

    <head>
        <link 
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/css/bootstrap.min.css" 
            rel="stylesheet" 
            integrity="sha384-+0n0xVW2eSR5OomGNYDnhzAbDsOXxcvSN1TPprVMTNDbiYZCxYbOOl7+AMvyTG2x" 
            crossorigin="anonymous"
        >
        <script type="module" src="path-to-components/ble-sensor-card.js"></script>
        <script type="module" src="path-to-components/ble-sensor-graph.js"></script>
    </head>
    <body>
        <div class="row">
            <ble-sensor-card name="your-device-name"></ble-sensor-card>
            <ble-sensor-graph name="your-device-name"></ble-sensor-graph>
        </div>      
    </body>

If your web server is not running on the same computer as ble2json, you need to add the host
attribute to the components: 

    <ble-sensor-graph name="example" host="192.168.1.123"></ble-sensor-graph>

If you've changed the default port, you also need to add the port attribute:

    <ble-sensor-graph name="example" host="192.168.1.123" port="5001"></ble-sensor-graph>

You can also add the locale attribute to override your browser's default settings for displaying
dates and times:

    <ble-sensor-graph name="example" locale="no"></ble-sensor-graph>
 


