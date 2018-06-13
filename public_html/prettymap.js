/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var com = { sweattrails: {} };

com.sweattrails.PrettyMap = function (elt) {
    this.elt = elt;
    if (!this.elt) {
        return;
    }
    this.mapid = this.elt.getAttribute('data-map-target');
    if (!this.mapid) return;
    elt.prettymap = this;

    this.map = L.map(this.mapid, {
        renderer: L.canvas(),
        preferCanvas: true
    });
    this.osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>'
    }).addTo(this.map);
    this.osm_bike = L.tileLayer('http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>'
    }).addTo(this.map);
    this.mapbox_dark = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &#169; OpenStreetMap contributors, CC-BY-SA, Imagery &#169; Mapbox',
        id: 'mapbox.dark',
        accessToken: 'pk.eyJ1IjoiamFuZGV2IiwiYSI6ImNpenBzbzFzNTAwcmgycnFnd3QycWFpbTgifQ.vIht_WItDuJwLuatY_S5xg'}).addTo(this.map);
    this.mapbox_rbh = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &#169; OpenStreetMap contributors, CC-BY-SA, Imagery &#169; Mapbox',
        id: 'mapbox.run-bike-hike',
        accessToken: 'pk.eyJ1IjoiamFuZGV2IiwiYSI6ImNpenBzbzFzNTAwcmgycnFnd3QycWFpbTgifQ.vIht_WItDuJwLuatY_S5xg'}).addTo(this.map);

    this.control = L.control.layers({
            "openstreetmap": this.osm,
            "openstreetmap Cycle": this.osm_bike,
            "Mapbox Run Bike Hike": this.mapbox_rbh,
            "Mapbox Dark": this.mapbox_dark
        }
        , null).addTo(this.map);
    this.gpx = null;
    this._elevation = null;
    this._logolayer = new L.layerGroup().addTo(this.map);
    this._iconlayers = {
        logo: { label: "Logo", icon: "runwaterloo.png", size: new L.point(200, 90) },
        water: { label: "Water Station", icon: "water.png" },
        firstaid: { label: "First Aid", icon: "firstaid.png" },
        police: { label: "Police", icon: "police.png" }
    };
    for (var l in this._iconlayers) {
        var layer = this._iconlayers[l];
        layer.group = new L.layerGroup().addTo(this.map);
        this.control.addOverlay(layer.group, layer.label);
    }
    this.map.on("click", this.click, this);
};

com.sweattrails.PrettyMap.prototype._t = function (t) {
    return this.elt.getElementsByTagName(t)[0];
};

com.sweattrails.PrettyMap.prototype._c = function(c) {
    return this.elt.getElementsByClassName(c)[0];
};

com.sweattrails.PrettyMap.prototype.click = function(e) {
    const inputs = document.getElementById("iconChoices").getElementsByTagName("input");
    const layer = Array.from(inputs).reduce((layer, input) => {
        return (input.checked) ? this._iconlayers[input.value] : layer;
    }, null);
    if (layer) {
        const sz = (layer.size) ? layer.size : new L.point(32, 32);
        L.marker(e.latlng, {
            icon: new L.icon({iconUrl: layer.icon, iconSize: sz}),
            draggable: true
        }).addTo(layer.group);
    }
};


com.sweattrails.PrettyMap.prototype.displayGPX = function (onloaded) {
    this.fieldid = this.elt.getAttribute('data-gpx-source-field');
    if (this.fieldid) {
        const field = document.getElementById(this.fieldid);
        if (field) {
            this.url = field.value;
        }
    } else {
        this.url = this.elt.getAttribute('data-gpx-source');
    }
    if (!this.url) return;

    this.gpx = new L.GPX(this.url, {
        async: true,
        marker_options: {
            startIconUrl: 'pin-icon-start.png',
            endIconUrl:   'pin-icon-end.png',
            shadowUrl:    'pin-shadow.png',
        },
        polyline_options: {
            weight: 5,
            color: '#4e95ff'
        }
    }).on('loaded', (e) => {
        const gpx = e.target;
        this.map.fitBounds(gpx.getBounds());
        this.control.addOverlay(gpx, gpx.get_name());
        if (onloaded) {
            onloaded(this);
        }
    });
    this.gpx.addTo(this.map);
};

com.sweattrails.PrettyMap.prototype.elevation = function () {
    if (this._elevation) {
        this.control.removeLayer(this._elevation);
        this.map.removeLayer(this._elevation);
        this._elevation = null;
    }
    this._elevation = new L.layerGroup().addTo(this.map);
    this.control.addOverlay(this._elevation, "Elevation Profile");
    const bounds = this.map.getBounds();
    const width = bounds.getEast() - bounds.getWest();
    const height = bounds.getNorth() - bounds.getSouth();
    const max_elev = this.gpx.get_elevation_max();
    const min_elev = this.gpx.get_elevation_min();
    const diff_elev = max_elev - min_elev;
    const y_scale = (height / 10) / diff_elev;
    const x_scale = (0.9*width) / this.gpx.get_distance();

    L.rectangle(
        [
            [ bounds.getSouth() + height/20, bounds.getWest() + width/20 ],
            [ bounds.getSouth() + 3*height/20, bounds.getEast() - width/20 ]
        ],
        { color: '#d1784c' }
    ).addTo(this._elevation);
    const data = this.gpx.get_elevation_data().reduce((data, point) => {
        const x = (parseFloat(point[0])*1000)*x_scale;
        const y = (parseFloat(point[1]) - min_elev) * y_scale;
        console.log(`x: ${x} y: ${y} data: ${data}`);
        data.push([ bounds.getSouth() + height/20 + y, bounds.getWest() + width/20 + x ]);
        return data;
    }, []);
    L.polyline(data, { color: '#d1784c' }).addTo(this._elevation);
};

com.sweattrails.PrettyMap.prototype.renderImage  = function(images) {
    leafletImage(this.map, (err, canvas) => {
        const img = document.createElement('img');
        const dimensions = this.map.getSize();
        img.width = dimensions.x / 2;
        img.height = dimensions.y / 2;
        img.src = canvas.toDataURL();
        document.getElementById(images).innerHTML = '';
        document.getElementById(images).appendChild(img);
    });
};

