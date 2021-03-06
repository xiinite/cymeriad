"use strict";
app.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyDikVRuax7kvuhRCjzb6clReS7927eU2jY',
        v: '3.24', //defaults to latest 3.X anyhow
        libraries: 'drawing,places,weather,geometry,visualization'
    });
});
app.controller('cymeriad.controller.chronicle.editmap', ['$scope', '$http', 'loading', 'ngToast', function ($scope, $http, loading, ngToast) {
    var events = {
        places_changed: function (searchBox) {
            var places = searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            // For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();
            places.forEach(function(place) {

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            var map = $scope.gmap.getGMap();
            map.fitBounds(bounds);
        }
    };
    $scope.gmap= {};
    $scope.mapid = '';
    $scope.chronicle = {};
    $scope.cid = '';
    $scope.map = { center: { latitude: 0, longitude: 0 }, zoom: 1, markers: [], polygons: []};
    $scope.searchbox = { template:'searchbox.tpl.html', events:events};
    $scope.lastObj = {};
    $scope.drawingManagerControl = {};
    $scope.shapes = {};
    $scope.selectedShape = null;
    $scope.selectedGroup = null;
    $scope.highlitedGroup = null;
    $scope.selectedLabelContent = {};
    $scope.selectedColor = '#FF0000';
    $scope.$watch('selectedColor', function(val) {});
    $scope.update = false;
    $scope.mapevents = {
        idle: function (e){
            if(!$scope.update) return;
            if($scope.gmap.getGMap){
                var map = $scope.gmap.getGMap();
                if(map){
                    map.setZoom($scope.map.zoom);
                    map.panTo({lat: $scope.map.center.latitude, lng: $scope.map.center.longitude});

                    var layer = new google.maps.FusionTablesLayer({
                        query: {
                            select: '\'col2>>0\'',
                            from: '1DTPoutko0rTNM_HtF6T3AOWLxiG3_d-1ML3KpTg'
                        },styles: [{
                            polygonOptions: {
                                strokeColor: '#0000FF',
                                strokeWeight: 0.7,
                                fillColor: "#000000",
                                fillOpacity: 0.1
                            }
                        }]
                    });
                    layer.setMap(map);
                    var i = $scope.map.markers.length;
                    while(i--){
                        var marker = $scope.map.markers[i];
                    }
                    $scope.update = false;
                }

                $scope.$apply();
            }
        }
    };
    $scope.drawevents = {
        overlaycomplete: function(manager, e) {
            var map = $scope.gmap.getGMap();
            var lastShape = $scope.shapes.getLastShape();
            lastShape.color = "#FFFFFF";

            var shapes = $scope.shapes.getShapes();
            var i = shapes.length;
            while(i--){
                shapes[i].set('strokeColor', "#000000")
            }
            lastShape.set('strokeColor', '#FFFFFF');
            var position = {};
            var offset = {};
            if(lastShape.type === 'marker'){
                position = lastShape.getPosition();
                addMarker(Date.now(), {latitude: lastShape.position.A, longitude: lastShape.position.F}, 'New Label', "#FFFFFF");
            }else{
                /*var bounds = new google.maps.LatLngBounds();
                for (i = 0; i < lastShape.getPath().getArray().length; i++) {
                    bounds.extend(lastShape.getPath().getArray()[i]);
                }
                position = bounds.getCenter();*/
                addPolygon(Date.now(), lastShape.getPath().getArray(), 'New Label', '#FFFFFF');
            }
            lastShape.setMap(null);

        }
    };

    var addMarker = function(id, position, label, color){
        try{
            $scope.map.markers.push({
                id: id,
                coords: {latitude: position.latitude, longitude: position.longitude},
                opts: {labelContent: label, labelStyle: {opacity: 1, textAlign: "center", fontSize: "12pt", color: "#000000"}},
                labeltext: label,
                color: color,
                type: 'marker',
                events: {
                    click: function(e){
                        var m = $scope.findMarker(e.key);
                        setOpacities();
                        $scope.selectedShape = m;
                        $scope.selectedColor = null;
                        $scope.selectedGroup = null;
                        $scope.highlitedGroup = null;
                        $scope.selectedLabelContent = m.opts.labelContent;
                    }
                }
            });
        }catch(error){
            console.log(error);
        }
    };

    var calcCenter = function(path){
        var x1 =path[0].latitude, x2 =path[0].latitude, y1 =path[0].longitude, y2 = path[0].longitude;
        for (var i = 0; i < path.length; i++) {
            x1 = Math.min(x1, path[i].latitude);
            x2 = Math.max(x2, path[i].latitude);
            y1 = Math.min(y1, path[i].longitude);
            y2 = Math.max(y2, path[i].longitude);
        }

        var center = {};
        center.latitude = x1 + ((x2 - x1) / 2);
        center.longitude = y1 + ((y2 - y1) / 2);
        return center;
    };
    var addPolygon = function(id, path, label, color, group){
        try{
            if(!group) group = "";
            var center = calcCenter(path);
            $scope.map.polygons.push({
                id: id,
                path: path,
                type: 'polygon',
                color: color,
                group: group,
                labeltext: label,
                stroke: {
                    color: color,
                    weight: 2
                },
                editable: false,
                draggable: false,
                geodesic: false,
                visible: true,
                fill: {
                    color: color,
                    opacity: 0.25
                },
                opts: {labelContent: label, labelStyle: {opacity: 1, textAlign: "center", fontSize: "12pt", width: "50px", color: "#000000"}},
                windowOpts: {visible: false},
                windowCoords: center,
                events: {
                    click: function(gPolygon, event, obj){
                        $scope.selectPolygon(obj);
                    }
                }
            });
        }catch(error){
            console.log(error);
        }
    };

    $scope.selectPolygon = function(polygon){
        var m = $scope.findPolygon(polygon);
        setOpacities();
        $scope.selectedShape = m;
        $scope.selectedShape.windowOpts.visible = true;
        $scope.selectedShape.fill.opacity = 0.8;
        $scope.selectedShape.stroke.color = '#000';
        $scope.selectedShape.stroke.weight = 4;
        $scope.selectedColor = m.color;
        $scope.selectedLabelContent = m.labeltext;
        $scope.selectedGroup = m.group;
        $scope.highlitedGroup = null;
    };

    $scope.closeClick = function(polygon) {
        polygon.windowOpts.visible = false;
    };

    $scope.highlightGroup = function(group){
        setOpacities();
        $scope.selectedShape = null;
        $scope.selectedColor = null;
        $scope.selectedLabelContent = null;
        $scope.selectedGroup = null;
        $scope.highlitedGroup = group;

        var i = $scope.map.polygons.length;
        while(i--){
            if($scope.map.polygons[i].group === group){
                $scope.map.polygons[i].fill.opacity = 0.8;
                $scope.map.polygons[i].stroke.color = '#000';
                $scope.map.polygons[i].stroke.weight = 4;
            }
        }
    };

    var setOpacities = function(){
        var i = $scope.map.polygons.length;
        while(i--){
            $scope.map.polygons[i].stroke.color = $scope.map.polygons[i].color;
            $scope.map.polygons[i].fill.opacity = 0.25;
            $scope.map.polygons[i].stroke.weight = 2;
            $scope.map.polygons[i].windowOpts.visible = false;
        }
    };

    $scope.findMarker = function(id){
        var i = $scope.map.markers.length;
        while(i--){
            if($scope.map.markers[i].id === id) return $scope.map.markers[i];
        }
    };
    $scope.findPolygon = function(obj){
        var i = $scope.map.polygons.length;
        while(i--){
            if($scope.map.polygons[i].path === obj.path) return $scope.map.polygons[i];
        }
    };

    $scope.setLabel = function(){
        $scope.selectedShape.opts.labelContent = ($scope.selectedLabelContent);
        $scope.selectedShape.labeltext =($scope.selectedLabelContent);
    };
    $scope.setGroup = function(){
        $scope.selectedShape.group =($scope.selectedGroup);
    };
    $scope.setColor = function(){
        $scope.selectedShape.color = $scope.selectedColor;
        if($scope.selectedShape.type === 'polygon'){
            $scope.selectedShape.stroke.color = $scope.selectedColor;
            $scope.selectedShape.fill.color = $scope.selectedColor;
        }
    };

    $scope.deleteShape = function(){
        if(!$scope.selectedShape) return;
        if($scope.selectedShape.type === 'marker'){
            $scope.map.markers.splice($scope.map.markers.indexOf($scope.selectedShape), 1);
        }else if($scope.selectedShape.type === 'polygon'){
            $scope.map.polygons.splice($scope.map.polygons.indexOf($scope.selectedShape), 1);
        }

        $scope.selectedShape = null;
        $scope.selectedColor = "#FFFFFF";
        $scope.selectedLabelContent = "";
    };

    $scope.save = function(){
        var saving = ngToast.create({
            className: 'info',
            content: 'Saving...',
            timeout: 2000
        });

        var config = {
          latitude: $scope.map.center.latitude,
          longitude: $scope.map.center.longitude,
          zoom: $scope.map.zoom
        };

        var nodes = {shapes: []};
        var i = $scope.map.markers.length;
        while(i--){
            var s = $scope.map.markers[i];
            nodes.shapes.push({
                id: s.id,
                position: s.coords,
                label: s.labeltext,
                color: s.color,
                type: s.type
            });
        }

        i = $scope.map.polygons.length;
        while(i--){
            var s = $scope.map.polygons[i];
            nodes.shapes.push({
                id: s.id,
                path: s.path,
                label: s.labeltext,
                color: s.color,
                type: s.type,
                group: s.group
            });
        }

        $http.post("/chronicle/updatemap", {id: $scope.mapid, nodes: nodes, config: config}).then(function(){
            ngToast.dismiss(saving);
            ngToast.create({
                className: 'success',
                content: 'Saved!',
                timeout: 2000
            });
        });
    };

    $scope.init = function (id, mapid) {
        $scope.mapid = mapid;
        $scope.cid = id;
        loading.show();
        var root = $scope;
        $http.get("/chronicle/find/" + id).then(function(response) {
            root.chronicle = response.data;
            $http.get("/chronicle/getmap/" + mapid).then(function(res){
                if(res.data){
                    var config = res.data.config;
                    var nodes = res.data.nodes;
                    if(config){
                        $scope.map.center.latitude = config.latitude;
                        $scope.map.center.longitude = config.longitude;
                        $scope.map.zoom = config.zoom;
                        //$scope.map.ltlg = new google.maps.GLatLng($scope.map.center.latitude,$scope.map.center.longitude);
                        $scope.update = true;
                    }
                    if(nodes){
                        if(nodes.shapes){
                            var i = nodes.shapes.length;
                            while(i--){
                                var s = nodes.shapes[i];
                                if(s.type == 'marker'){
                                    addMarker(s.id, s.position, s.label, s.color);
                                }else if (s.type == 'polygon'){
                                    var pi = s.path.length;
                                    while(pi--){
                                        if(s.path[pi] != null){

                                            if(s.path[pi].A !== undefined && s.path[pi].F !== undefined)
                                                s.path[pi] = {latitude: s.path[pi].A, longitude: s.path[pi].F};
                                            if(s.path[pi].lat !== undefined && s.path[pi].lng !== undefined)
                                                s.path[pi] = {latitude: s.path[pi].lat, longitude: s.path[pi].lng};
                                        }
                                    }
                                    addPolygon(s.id, s.path, s.label, s.color, s.group);
                                }
                            }
                        }
                    }
                }
                loading.hide();
            });
        });

    };
}]);
