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
    this.url = this.elt.getAttribute('data-gpx-source');
    this.mapid = this.elt.getAttribute('data-map-target');
    if (!this.url || !this.mapid) return;

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
            "Mapbox Dark": this.mapbox_dark,
            "Mapbox Run Bike Hike": this.mapbox_rbh
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
    var layer = null;
    var inputs = document.getElementById("iconChoices").getElementsByTagName("input");
    for (var ix = 0; ix < inputs.length; ix++ ) {
        var input = inputs.item(ix);
        if (input.checked) {
            layer = this._iconlayers[input.value];
        }
    }
    if (layer) {
        var sz = (layer.size) ? layer.size : new L.point(32, 32);
        L.marker(e.latlng, {
            icon: new L.icon({iconUrl: layer.icon, iconSize: sz}),
            draggable: true
        }).addTo(layer.group);
    }
};


com.sweattrails.PrettyMap.prototype.displayGPX = function (onloaded) {
    var _this = this;
    var cb = onloaded;
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
    }).on('loaded', function(e) {
        var gpx = e.target;
        _this.map.fitBounds(gpx.getBounds());
        _this.control.addOverlay(gpx, gpx.get_name());
        if (cb) {
            cb(_this);
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
    var bounds = this.map.getBounds();
    var width = bounds.getEast() - bounds.getWest();
    var height = bounds.getNorth() - bounds.getSouth();
    var max_elev = this.gpx.get_elevation_max();
    var min_elev = this.gpx.get_elevation_min();
    var diff_elev = max_elev - min_elev;
    var elev = this.gpx.get_elevation_data();
    var y_scale = (height / 10) / diff_elev;
    var x_scale = (0.9*width) / this.gpx.get_distance();

    L.rectangle(
        [
            [ bounds.getSouth() + height/20, bounds.getWest() + width/20 ],
            [ bounds.getSouth() + 3*height/20, bounds.getEast() - width/20 ]
        ],
        { color: '#d1784c' }
    ).addTo(this._elevation);
    var data = [];
    for (var ix = 0; ix < elev.length; ix++) {
        var point = elev[ix];
        var x = (parseFloat(point[0])*1000)*x_scale;
        var y = (parseFloat(point[1]) - min_elev) * y_scale;
        console.log("ix: " + ix + " x: " + x, " y: " + y);
        data.push([ bounds.getSouth() + height/20 + y, bounds.getWest() + width/20 + x ]);
    }
    L.polyline(data, { color: '#d1784c' }).addTo(this._elevation);
};

com.sweattrails.PrettyMap.prototype.renderImage  = function(images) {
    var _ = this;
    leafletImage(this.map, function(err, canvas) {
        var img = document.createElement('img');
        var dimensions = _.map.getSize();
        img.width = dimensions.x / 2;
        img.height = dimensions.y / 2;
        img.src = canvas.toDataURL();
        document.getElementById(images).innerHTML = '';
        document.getElementById(images).appendChild(img);
    });
};

