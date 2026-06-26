// No-API-key map: OpenStreetMap rendered with Leaflet inside a WebView.
// react-native-maps needs a Google Maps key on Android (and hard-crashes
// without one), so we use this instead — same OSM tiles, zero native crash risk.
import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export interface OsmMarker {
    lat: number;
    lng: number;
    label?: string;
    color?: string;
    round?: boolean; // circular (bus) vs teardrop (stop)
    rotation?: number;
}

export interface OsmMapProps {
    center: [number, number];
    zoom?: number;
    markers?: OsmMarker[];
    polyline?: [number, number][]; // [lat, lng][]
    lineColor?: string;
    follow?: boolean; // recenter when `center` changes
}

function buildHtml(center: [number, number], zoom: number): string {
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#0a0f1e}</style>
</head><body><div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${center[0]},${center[1]}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var markerLayer = L.layerGroup().addTo(map);
  var lineLayer = L.layerGroup().addTo(map);
  function icon(m){
    var radius = m.round ? '50%' : '10px 10px 10px 2px';
    var rot = m.rotation ? 'transform:rotate('+m.rotation+'deg);' : '';
    var html = '<div style="background:'+(m.color||'#2dbc75')+';color:#fff;font-size:10px;line-height:1;font-weight:800;letter-spacing:.5px;padding:5px 8px;border-radius:'+radius+';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);'+rot+'white-space:nowrap;">'+(m.label||'')+'</div>';
    return L.divIcon({html:html,className:'',iconSize:null,iconAnchor:m.round?[14,14]:[10,28]});
  }
  function render(d){
    markerLayer.clearLayers(); lineLayer.clearLayers();
    (d.markers||[]).forEach(function(m){ L.marker([m.lat,m.lng],{icon:icon(m)}).addTo(markerLayer); });
    if(d.polyline && d.polyline.length>1){ L.polyline(d.polyline,{color:d.lineColor||'#2dbc75',weight:5,opacity:.9}).addTo(lineLayer); }
    if(d.follow && d.center){ map.setView(d.center, map.getZoom(), {animate:true}); }
  }
  window.__update = function(s){ try{ render(JSON.parse(s)); }catch(e){} };
</script></body></html>`;
}

export default function OsmMap({ center, zoom = 14, markers = [], polyline = [], lineColor, follow = true }: OsmMapProps) {
    const ref = useRef<WebView>(null);
    // Build the HTML once; updates are pushed via injectJavaScript.
    const html = useMemo(() => buildHtml(center, zoom), []); // eslint-disable-line react-hooks/exhaustive-deps

    const payload = useMemo(
        () => JSON.stringify({ markers, polyline, lineColor, follow, center }),
        [markers, polyline, lineColor, follow, center],
    );

    useEffect(() => {
        // Re-render markers/line/center whenever inputs change.
        ref.current?.injectJavaScript(`window.__update && window.__update(${JSON.stringify(payload)});true;`);
    }, [payload]);

    return (
        <View style={{ flex: 1 }}>
            <WebView
                ref={ref}
                originWhitelist={['*']}
                source={{ html }}
                style={{ flex: 1, backgroundColor: '#0a0f1e' }}
                javaScriptEnabled
                domStorageEnabled
                onLoadEnd={() => {
                    // Push the first render once Leaflet is ready.
                    ref.current?.injectJavaScript(`window.__update && window.__update(${JSON.stringify(payload)});true;`);
                }}
                androidLayerType="hardware"
                setBuiltInZoomControls={false}
            />
            <View
                style={{ position: 'absolute', bottom: 2, right: 4, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 4, borderRadius: 4 }}
                pointerEvents="none"
            >
                <Text style={{ fontSize: 9, color: '#333' }}>© OpenStreetMap</Text>
            </View>
        </View>
    );
}
