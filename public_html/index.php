
<!doctype html>

<!--
  Copyright (C) 2011-2012 Pavel Shramov
  Copyright (C) 2013 Maxime Petazzoni <maxime.petazzoni@bulix.org>
  All Rights Reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

  - Redistributions of source code must retain the above copyright notice,
    this list of conditions and the following disclaimer.

  - Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
  POSSIBILITY OF SUCH DAMAGE.
-->

<html>
    <head>
        <title>leaflet-gpx demo</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.3/leaflet.css" />
        <style type="text/css">
            body { width: 1000px; margin: 0 auto; }
            .gpx { border: 2px #aaa solid; border-radius: 5px;
                   box-shadow: 0 0 3px 3px #ccc;
                   width: 1000px; margin: 1em auto; }
            .gpx header { padding: 0.5em; }
            .gpx h3 { margin: 0; padding: 0; font-weight: bold; }
            .gpx .start { font-size: smaller; color: #444; }
            .gpx .map { border: 1px #888 solid; border-left: none; border-right: none;
                        width: 1000px; height: 700px; margin: 0; }
            .gpx footer { background: #f0f0f0; padding: 0.5em; }
            .gpx ul.info { list-style: none; margin: 0; padding: 0; font-size: smaller; }
            .gpx ul.info li { color: #666; padding: 2px; display: inline; }
            .gpx ul.info li span { color: black; }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.3/leaflet.js"></script>
        <script src="https://rawgithub.com/mpetazzoni/leaflet-gpx/master/gpx.js"></script>
        <script src="https://mapbox.github.io/leaflet-image/leaflet-image.js"></script>
        <script src="prettymap.js"></script>
    </head>
    <body>
        <section id="demo" class="gpx" data-gpx-source-field="gpxfile" data-map-target="demo-map">
            <header>
                <div id="picker">
                    <select id="gpxpicker">
                        <option value="">Select ...</option>
                        <?php
                            $gpxfiles = '/home/jan/projects/RWMaps/public_html';
                            if (($_SERVER['REQUEST_METHOD'] == 'POST') && !is_null($_FILES['gpxfile'])) {
                                $tmp = $_FILES['gpxfile']['tmp_name'];
                                if (is_uploaded_file($tmp)) {
                                    $parts = pathinfo($tmp);
                                    $fname = $parts['filename'];
                                    $xml = simplexml_load_file($tmp);
                                    if ($xml !== false) {
                                        if ($xml->trk && $xml->trk->name) {
                                            $map = $xml->trk->name;
                                        } else {
                                            die("GPX file without name element");
                                        }
                                    } else {
                                        die("Invalid GPX file");
                                    }
                                    move_uploaded_file($tmp, "$gpxfiles/$map.gpx");
                                } else {
                                    $map = null;
                                }
                            } else {
                                $map = $_REQUEST['map'];
                            }
                            $d = dir($gpxfiles);
                            while (false !== ($entry = $d->read())) {
                                $parts = pathinfo($entry);
                                $fname = $parts['filename'];
                                if ($parts['extension'] === 'gpx') {
                                    $xml = simplexml_load_file("$gpxfiles/$entry");
                                    if ($xml !== false) {
                                        $name = null;
                                        if ($xml->trk && $xml->trk->name) {
                                            $name = $xml->trk->name;
                                        } else {
                                            $name = "$fname [name not found]";
                                        }
                                    } else {
                                        $name = "$fname [ERROR]";
                                    }
                                    echo "<option value=\"$fname\"";
                                    if ($fname == $map) {
                                        echo " selected='/'";
                                    }
                                    echo ">$name</option>\n";
                                }
                            }
                            $d->close();
                        ?>
                    </select>
                    <input type="hidden" id="gpxfile"/>
                </div>
            </header>

            <article>
                <div class="map" id="demo-map"></div>
            </article>

            <script type="application/javascript">
            </script>

            <footer>
                <ul class="info">
                    <li>Distance:&nbsp;<span class="distance"></span>&nbsp;km</li>
                    &mdash;
                    <li>Elevation:&nbsp;+<span class="elevation-gain"></span>&nbsp;m
                        -<span class="elevation-loss"></span>&nbsp;m
                        (net:&nbsp;<span class="elevation-net"></span>&nbsp;m)</li>
                    &mdash;
                    <li><button id="elevation-btn" onclick="document.getElementById('demo').prettymap.elevation()">Elevation</button></li>
                    <li><button id="image-btn" onclick="document.getElementById('demo').prettymap.renderImage('images')">Snapshot</button></li>
                </ul>
                <div id="layers">
                    <form id="iconChoices">
                        <fieldset>
                            <legend>Select icon</legend>
                            <div>
                                <input type="radio" id="choiceLogo" name="iconChoices" value="logo" checked="/">
                                <label for="choiceLogo">Logo</label>
                                <input type="radio" id="choiceWater" name="iconChoices" value="water">
                                <label for="choiceWater">Waterstation</label>
                                <input type="radio" id="choiceFirstaid" name="iconChoices" value="firstaid">
                                <label for="choiceFirstaid">First Aid</label>
                                <input type="radio" id="choicePolice" name="iconChoices" value="police">
                                <label for="choicePolice">Police</label>
                            </div>
                        </fieldset>
                    </form>
                </div>
                <div>
                    <form enctype="multipart/form-data" action="<?php echo $_SERVER["REQUEST_URI"]; ?>" method="POST">
                        <fieldset>
                            <legend>Upload GPX File</legend>
                            <input name="gpxfile" type="file"/><input type="submit" value="Send"/>
                        </fieldset>
                    </form>
                </div>
                <div id="images"></div>
            </footer>
        </section>

        <script type="application/javascript">
            function pickGPX(fld) {
                document.getElementById('gpxfile').value = `${fld.options[fld.selectedIndex].value}.gpx`;

                document.getElementById('demo').prettymap.displayGPX(function (map) {
                    map._c('distance').textContent = (map.gpx.get_distance() / 1000).toFixed(2);
                    map._c('elevation-gain').textContent = map.gpx.get_elevation_gain().toFixed(0);
                    map._c('elevation-loss').textContent = map.gpx.get_elevation_loss().toFixed(0);
                    map._c('elevation-net').textContent = (map.gpx.get_elevation_gain() - map.gpx.get_elevation_loss()).toFixed(0);
                });
            }

            document.addEventListener('DOMContentLoaded',function() {
                new com.sweattrails.PrettyMap(document.getElementById('demo'));
                document.getElementById('gpxpicker').onchange=(ev) => {
                    pickGPX(ev.target);
                };
                <?php
                    if (!is_null($map)) {
                ?>
                        pickGPX(document.getElementById('gpxpicker'));
                <?php
                    }
                ?>
            }, false);
        </script>
    </body>
</html>
