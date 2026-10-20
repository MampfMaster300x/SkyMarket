/* SKYMARKET – Ökonomiekern v0.2 (JavaScript)
 * Basis: Python-Referenz v0.1 (gleiche Nachfrage-, Wahl- und Kostenformeln).
 * Neu in v0.2: Personal, Kerosineinkauf und Hedging, Stationen (Terminal, Abfertigung, Hangar),
 * Slots, Fachkräfte/Berater, Marktstudien, Ereignisse und Makroökonomie, Umsteiger über Basen,
 * Beiladefracht, Wartungschecks und Flugzeugalter, Flugzeugmarkt, ACMI-Charter, Kredite und Rating,
 * Marke und Marketing, weitere Basen, Unternehmensstufen.
 * Geld im Ledger als Integer-Cent. Zufall über seedbaren PRNG (Spielstand speicherbar).
 */
const SM = (() => {
  'use strict';

  // ===========================================================================
  // Parameter
  // ===========================================================================
  // @@AIRPORTS-BEGIN (generiert aus airports_data.py)
  const AIRPORT_DATA = {"ATL":{"name":"Atlanta","lat":33.64,"lon":-84.43,"pop":6.3,"income":1.35,"biz":1.2,"tour":1.0,"land":5.2,"paxfee":18,"tax":18,"taxi":0.2,"country":"US","rank":1,"pax":106.0,"region":"Nordamerika"},"DXB":{"name":"Dubai","lat":25.25,"lon":55.36,"pop":3.6,"income":1.2,"biz":1.3,"tour":2.0,"land":6.4,"paxfee":26,"tax":10,"taxi":0.19,"country":"AE","rank":2,"pax":95.0,"region":"Nahost & Afrika"},"HND":{"name":"Tokio-Haneda","lat":35.55,"lon":139.78,"pop":25.0,"income":0.95,"biz":1.6,"tour":1.3,"land":11.3,"paxfee":28,"tax":7,"taxi":0.18,"country":"JP","rank":3,"pax":92.0,"region":"Asien"},"DFW":{"name":"Dallas","lat":32.9,"lon":-97.04,"pop":8.0,"income":1.35,"biz":1.3,"tour":0.8,"land":4.9,"paxfee":17,"tax":18,"taxi":0.16,"country":"US","rank":4,"pax":86.0,"region":"Nordamerika"},"PVG":{"name":"Shanghai-Pudong","lat":31.14,"lon":121.81,"pop":15.0,"income":0.45,"biz":1.4,"tour":1.2,"land":6.1,"paxfee":15,"tax":6,"taxi":0.16,"country":"CN","rank":5,"pax":85.0,"region":"Asien"},"ORD":{"name":"Chicago","lat":41.98,"lon":-87.9,"pop":9.5,"income":1.35,"biz":1.5,"tour":1.1,"land":4.9,"paxfee":17,"tax":18,"taxi":0.16,"country":"US","rank":6,"pax":85.0,"region":"Nordamerika"},"LHR":{"name":"London-Heathrow","lat":51.47,"lon":-0.45,"pop":14.0,"income":1.15,"biz":1.8,"tour":1.6,"land":12,"paxfee":52,"tax":15,"taxi":0.15,"country":"GB","rank":7,"pax":84.0,"region":"Europa"},"IST":{"name":"Istanbul","lat":41.26,"lon":28.74,"pop":12.0,"income":0.45,"biz":1.2,"tour":1.8,"land":4.9,"paxfee":18,"tax":5,"taxi":0.15,"country":"TR","rank":8,"pax":84.0,"region":"Europa"},"CAN":{"name":"Guangzhou","lat":23.39,"lon":113.3,"pop":19.0,"income":0.45,"biz":1.2,"tour":0.9,"land":6.1,"paxfee":15,"tax":6,"taxi":0.15,"country":"CN","rank":9,"pax":84.0,"region":"Asien"},"DEN":{"name":"Denver","lat":39.86,"lon":-104.67,"pop":3.5,"income":1.35,"biz":1.0,"tour":1.2,"land":4.8,"paxfee":17,"tax":18,"taxi":0.15,"country":"US","rank":10,"pax":82.0,"region":"Nordamerika"},"DEL":{"name":"Delhi","lat":28.56,"lon":77.1,"pop":30.0,"income":0.18,"biz":1.0,"tour":1.2,"land":4.8,"paxfee":10,"tax":4,"taxi":0.14,"country":"IN","rank":11,"pax":78.0,"region":"Asien"},"ICN":{"name":"Seoul-Incheon","lat":37.46,"lon":126.44,"pop":22.0,"income":0.9,"biz":1.3,"tour":1.3,"land":7.0,"paxfee":18,"tax":7,"taxi":0.13,"country":"KR","rank":12,"pax":74.0,"region":"Asien"},"LAX":{"name":"Los Angeles","lat":33.94,"lon":-118.41,"pop":13.0,"income":1.35,"biz":1.3,"tour":1.5,"land":4.7,"paxfee":16,"tax":18,"taxi":0.13,"country":"US","rank":13,"pax":74.0,"region":"Nordamerika"},"CDG":{"name":"Paris-CDG","lat":49.01,"lon":2.55,"pop":12.0,"income":1.1,"biz":1.6,"tour":1.7,"land":9,"paxfee":24,"tax":7,"taxi":0.15,"country":"FR","rank":14,"pax":72.0,"region":"Europa"},"PEK":{"name":"Peking-Capital","lat":40.08,"lon":116.58,"pop":14.0,"income":0.45,"biz":1.4,"tour":1.2,"land":5.8,"paxfee":14,"tax":6,"taxi":0.12,"country":"CN","rank":15,"pax":71.0,"region":"Asien"},"SIN":{"name":"Singapur","lat":1.36,"lon":103.99,"pop":6.0,"income":1.4,"biz":1.6,"tour":1.5,"land":8.0,"paxfee":34,"tax":8,"taxi":0.11,"country":"SG","rank":16,"pax":70.0,"region":"Asien"},"AMS":{"name":"Amsterdam","lat":52.31,"lon":4.77,"pop":4.0,"income":1.15,"biz":1.3,"tour":1.3,"land":8,"paxfee":33,"tax":29,"taxi":0.1,"country":"NL","rank":17,"pax":69.0,"region":"Europa"},"MAD":{"name":"Madrid","lat":40.47,"lon":-3.57,"pop":7.0,"income":0.85,"biz":1.2,"tour":1.4,"land":5.7,"paxfee":17,"tax":0,"taxi":0.11,"country":"ES","rank":18,"pax":68.0,"region":"Europa"},"SZX":{"name":"Shenzhen","lat":22.64,"lon":113.81,"pop":13.0,"income":0.45,"biz":1.3,"tour":0.6,"land":5.6,"paxfee":14,"tax":6,"taxi":0.1,"country":"CN","rank":19,"pax":66.0,"region":"Asien"},"KUL":{"name":"Kuala Lumpur","lat":2.75,"lon":101.71,"pop":8.0,"income":0.5,"biz":1.1,"tour":1.3,"land":4.5,"paxfee":13,"tax":4,"taxi":0.09,"country":"MY","rank":20,"pax":63.0,"region":"Asien"},"FRA":{"name":"Frankfurt","lat":50.03,"lon":8.57,"pop":5.8,"income":1.15,"biz":1.5,"tour":0.7,"land":9,"paxfee":26,"tax":15,"taxi":0.1,"country":"DE","rank":21,"pax":63.0,"region":"Europa"},"BKK":{"name":"Bangkok","lat":13.69,"lon":100.75,"pop":12.0,"income":0.35,"biz":1.0,"tour":2.2,"land":4.5,"paxfee":17,"tax":4,"taxi":0.09,"country":"TH","rank":22,"pax":63.0,"region":"Asien"},"JFK":{"name":"New York-JFK","lat":40.64,"lon":-73.78,"pop":12.0,"income":1.35,"biz":1.8,"tour":1.6,"land":4.5,"paxfee":16,"tax":18,"taxi":0.09,"country":"US","rank":23,"pax":63.0,"region":"Nordamerika"},"HKG":{"name":"Hongkong","lat":22.31,"lon":113.92,"pop":7.5,"income":1.1,"biz":1.7,"tour":1.6,"land":7.7,"paxfee":17,"tax":15,"taxi":0.09,"country":"HK","rank":24,"pax":61.0,"region":"Asien"},"MCO":{"name":"Orlando","lat":28.43,"lon":-81.31,"pop":2.8,"income":1.35,"biz":0.5,"tour":3.0,"land":4.4,"paxfee":15,"tax":18,"taxi":0.08,"country":"US","rank":25,"pax":58.0,"region":"Nordamerika"},"BCN":{"name":"Barcelona","lat":41.3,"lon":2.08,"pop":5.5,"income":0.85,"biz":1.0,"tour":1.8,"land":5,"paxfee":15,"tax":0,"taxi":0.0,"country":"ES","rank":26,"pax":57.0,"region":"Europa"},"TFU":{"name":"Chengdu-Tianfu","lat":30.31,"lon":104.44,"pop":9.0,"income":0.45,"biz":1.0,"tour":1.1,"land":5.4,"paxfee":13,"tax":6,"taxi":0.08,"country":"CN","rank":27,"pax":57.0,"region":"Asien"},"BOM":{"name":"Mumbai","lat":19.09,"lon":72.87,"pop":22.0,"income":0.18,"biz":1.3,"tour":1.0,"land":4.3,"paxfee":9,"tax":4,"taxi":0.07,"country":"IN","rank":28,"pax":56.0,"region":"Asien"},"MIA":{"name":"Miami","lat":25.8,"lon":-80.29,"pop":6.0,"income":1.35,"biz":1.2,"tour":2.2,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":29,"pax":55.0,"region":"Nordamerika"},"LAS":{"name":"Las Vegas","lat":36.08,"lon":-115.15,"pop":2.3,"income":1.35,"biz":0.6,"tour":3.0,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":30,"pax":55.0,"region":"Nordamerika"},"CGK":{"name":"Jakarta","lat":-6.13,"lon":106.66,"pop":30.0,"income":0.25,"biz":1.0,"tour":0.8,"land":4.3,"paxfee":11,"tax":4,"taxi":0.07,"country":"ID","rank":31,"pax":55.0,"region":"Asien"},"SFO":{"name":"San Francisco","lat":37.62,"lon":-122.38,"pop":7.5,"income":1.35,"biz":1.6,"tour":1.4,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":32,"pax":55.0,"region":"Nordamerika"},"DOH":{"name":"Doha","lat":25.27,"lon":51.61,"pop":2.5,"income":1.4,"biz":1.1,"tour":0.8,"land":5.4,"paxfee":21,"tax":10,"taxi":0.07,"country":"QA","rank":33,"pax":54.0,"region":"Nahost & Afrika"},"CLT":{"name":"Charlotte","lat":35.21,"lon":-80.94,"pop":2.8,"income":1.35,"biz":1.0,"tour":0.7,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":34,"pax":54.0,"region":"Nordamerika"},"PKX":{"name":"Peking-Daxing","lat":39.51,"lon":116.41,"pop":8.0,"income":0.45,"biz":1.0,"tour":1.0,"land":5.4,"paxfee":13,"tax":6,"taxi":0.07,"country":"CN","rank":35,"pax":54.0,"region":"Asien"},"JED":{"name":"Dschidda","lat":21.68,"lon":39.16,"pop":4.5,"income":0.8,"biz":0.9,"tour":1.2,"land":5.3,"paxfee":19,"tax":12,"taxi":0.07,"country":"SA","rank":36,"pax":53.0,"region":"Nahost & Afrika"},"SEA":{"name":"Seattle","lat":47.45,"lon":-122.31,"pop":4.2,"income":1.35,"biz":1.3,"tour":1.1,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":37,"pax":53.0,"region":"Nordamerika"},"MNL":{"name":"Manila","lat":14.51,"lon":121.02,"pop":25.0,"income":0.22,"biz":1.0,"tour":0.9,"land":4.2,"paxfee":13,"tax":4,"taxi":0.06,"country":"PH","rank":38,"pax":52.0,"region":"Asien"},"PHX":{"name":"Phoenix","lat":33.43,"lon":-112.01,"pop":5.0,"income":1.35,"biz":1.0,"tour":1.2,"land":4.2,"paxfee":15,"tax":18,"taxi":0.06,"country":"US","rank":39,"pax":52.0,"region":"Nordamerika"},"FCO":{"name":"Rom","lat":41.8,"lon":12.24,"pop":4.3,"income":0.85,"biz":1.0,"tour":1.7,"land":7,"paxfee":20,"tax":7,"taxi":0.05,"country":"IT","rank":40,"pax":51.0,"region":"Europa"},"HGH":{"name":"Hangzhou","lat":30.23,"lon":120.43,"pop":12.0,"income":0.45,"biz":1.1,"tour":1.2,"land":5.2,"paxfee":13,"tax":6,"taxi":0.06,"country":"CN","rank":41,"pax":50.0,"region":"Asien"},"SHA":{"name":"Shanghai-Hongqiao","lat":31.2,"lon":121.34,"pop":10.0,"income":0.45,"biz":1.3,"tour":0.9,"land":5.2,"paxfee":13,"tax":6,"taxi":0.06,"country":"CN","rank":42,"pax":50.0,"region":"Asien"},"CKG":{"name":"Chongqing","lat":29.72,"lon":106.64,"pop":15.0,"income":0.45,"biz":0.9,"tour":0.9,"land":5.2,"paxfee":13,"tax":6,"taxi":0.06,"country":"CN","rank":43,"pax":50.0,"region":"Asien"},"KMG":{"name":"Kunming","lat":25.1,"lon":102.93,"pop":8.0,"income":0.45,"biz":0.8,"tour":1.3,"land":5.2,"paxfee":13,"tax":6,"taxi":0.06,"country":"CN","rank":44,"pax":50.0,"region":"Asien"},"XIY":{"name":"Xi'an","lat":34.45,"lon":108.75,"pop":13.0,"income":0.45,"biz":0.8,"tour":1.2,"land":5.2,"paxfee":13,"tax":6,"taxi":0.05,"country":"CN","rank":45,"pax":49.0,"region":"Asien"},"SAW":{"name":"Istanbul-Sabiha","lat":40.9,"lon":29.31,"pop":6.0,"income":0.45,"biz":0.8,"tour":1.0,"land":4.2,"paxfee":16,"tax":5,"taxi":0.05,"country":"TR","rank":46,"pax":48.0,"region":"Europa"},"IAH":{"name":"Houston","lat":29.99,"lon":-95.34,"pop":7.0,"income":1.35,"biz":1.3,"tour":0.8,"land":4.2,"paxfee":15,"tax":18,"taxi":0.05,"country":"US","rank":47,"pax":48.0,"region":"Nordamerika"},"TPE":{"name":"Taipeh","lat":25.08,"lon":121.23,"pop":9.0,"income":0.9,"biz":1.2,"tour":1.2,"land":6.2,"paxfee":16,"tax":10,"taxi":0.05,"country":"TW","rank":48,"pax":48.0,"region":"Asien"},"YYZ":{"name":"Toronto","lat":43.68,"lon":-79.63,"pop":7.0,"income":1.15,"biz":1.3,"tour":1.1,"land":6.2,"paxfee":26,"tax":15,"taxi":0.05,"country":"CA","rank":49,"pax":47.0,"region":"Nordamerika"},"GRU":{"name":"São Paulo","lat":-23.43,"lon":-46.47,"pop":22.0,"income":0.5,"biz":1.2,"tour":0.9,"land":5.2,"paxfee":16,"tax":10,"taxi":0.05,"country":"BR","rank":50,"pax":47.0,"region":"Lateinamerika"},"EWR":{"name":"New York-Newark","lat":40.69,"lon":-74.17,"pop":7.0,"income":1.35,"biz":1.3,"tour":1.0,"land":4.2,"paxfee":15,"tax":18,"taxi":0.05,"country":"US","rank":51,"pax":49.0,"region":"Nordamerika"},"MEX":{"name":"Mexiko-Stadt","lat":19.44,"lon":-99.07,"pop":22.0,"income":0.52,"biz":1.1,"tour":1.2,"land":5.1,"paxfee":26,"tax":15,"taxi":0.04,"country":"MX","rank":52,"pax":45.0,"region":"Lateinamerika"},"BOG":{"name":"Bogotá","lat":4.7,"lon":-74.15,"pop":11.0,"income":0.42,"biz":1.0,"tour":0.9,"land":4.1,"paxfee":18,"tax":15,"taxi":0.04,"country":"CO","rank":53,"pax":45.0,"region":"Lateinamerika"},"BOS":{"name":"Boston","lat":42.36,"lon":-71.01,"pop":5.0,"income":1.35,"biz":1.5,"tour":1.2,"land":4.1,"paxfee":14,"tax":18,"taxi":0.04,"country":"US","rank":54,"pax":43.0,"region":"Nordamerika"},"LGW":{"name":"London-Gatwick","lat":51.15,"lon":-0.19,"pop":6.0,"income":1.15,"biz":0.9,"tour":1.8,"land":9.1,"paxfee":30,"tax":15,"taxi":0.04,"country":"GB","rank":55,"pax":43.0,"region":"Europa"},"MUC":{"name":"München","lat":48.35,"lon":11.79,"pop":4.6,"income":1.2,"biz":1.3,"tour":1.0,"land":8,"paxfee":25,"tax":15,"taxi":0.05,"country":"DE","rank":56,"pax":42.0,"region":"Europa"},"BLR":{"name":"Bengaluru","lat":13.2,"lon":77.71,"pop":13.0,"income":0.18,"biz":1.2,"tour":0.8,"land":4.0,"paxfee":8,"tax":4,"taxi":0.03,"country":"IN","rank":57,"pax":41.0,"region":"Asien"},"SVO":{"name":"Moskau","lat":55.97,"lon":37.41,"pop":12.0,"income":0.45,"biz":1.1,"tour":1.0,"land":5.0,"paxfee":12,"tax":0,"taxi":0.03,"country":"RU","rank":58,"pax":40.0,"region":"Europa"},"SYD":{"name":"Sydney","lat":-33.94,"lon":151.18,"pop":5.5,"income":1.25,"biz":1.3,"tour":1.6,"land":8.0,"paxfee":25,"tax":35,"taxi":0.03,"country":"AU","rank":59,"pax":41.0,"region":"Ozeanien"},"SGN":{"name":"Ho-Chi-Minh-Stadt","lat":10.82,"lon":106.66,"pop":12.0,"income":0.25,"biz":0.9,"tour":1.1,"land":4.0,"paxfee":12,"tax":4,"taxi":0.03,"country":"VN","rank":60,"pax":41.0,"region":"Asien"},"NRT":{"name":"Tokio-Narita","lat":35.77,"lon":140.39,"pop":12.0,"income":0.95,"biz":1.0,"tour":1.4,"land":8.9,"paxfee":22,"tax":7,"taxi":0.02,"country":"JP","rank":61,"pax":38.0,"region":"Asien"},"AYT":{"name":"Antalya","lat":36.9,"lon":30.8,"pop":2.7,"income":0.45,"biz":0.2,"tour":3.5,"land":4.0,"paxfee":15,"tax":5,"taxi":0.02,"country":"TR","rank":62,"pax":38.0,"region":"Europa"},"RUH":{"name":"Riad","lat":24.96,"lon":46.7,"pop":7.5,"income":0.8,"biz":1.1,"tour":0.6,"land":4.9,"paxfee":18,"tax":12,"taxi":0.02,"country":"SA","rank":63,"pax":37.0,"region":"Nahost & Afrika"},"MSP":{"name":"Minneapolis","lat":44.88,"lon":-93.22,"pop":3.7,"income":1.35,"biz":1.1,"tour":0.7,"land":3.9,"paxfee":14,"tax":18,"taxi":0.02,"country":"US","rank":64,"pax":37.0,"region":"Nordamerika"},"MEL":{"name":"Melbourne","lat":-37.67,"lon":144.84,"pop":5.2,"income":1.25,"biz":1.1,"tour":1.2,"land":7.9,"paxfee":25,"tax":35,"taxi":0.02,"country":"AU","rank":65,"pax":37.0,"region":"Ozeanien"},"FLL":{"name":"Fort Lauderdale","lat":26.07,"lon":-80.15,"pop":4.0,"income":1.35,"biz":0.7,"tour":1.8,"land":3.9,"paxfee":14,"tax":18,"taxi":0.01,"country":"US","rank":66,"pax":35.0,"region":"Nordamerika"},"LIS":{"name":"Lissabon","lat":38.77,"lon":-9.13,"pop":2.9,"income":0.75,"biz":0.8,"tour":1.6,"land":6,"paxfee":18,"tax":0,"taxi":0.0,"country":"PT","rank":67,"pax":35.0,"region":"Europa"},"LGA":{"name":"New York-LaGuardia","lat":40.78,"lon":-73.87,"pop":7.0,"income":1.35,"biz":1.5,"tour":1.0,"land":3.9,"paxfee":14,"tax":18,"taxi":0.01,"country":"US","rank":68,"pax":33.0,"region":"Nordamerika"},"PMI":{"name":"Palma","lat":39.55,"lon":2.74,"pop":0.9,"income":0.85,"biz":0.3,"tour":2.5,"land":5,"paxfee":14,"tax":0,"taxi":0.0,"country":"ES","rank":69,"pax":33.0,"region":"Europa"},"DUB":{"name":"Dublin","lat":53.43,"lon":-6.27,"pop":2.2,"income":1.3,"biz":1.2,"tour":1.3,"land":5.8,"paxfee":19,"tax":0,"taxi":0.01,"country":"IE","rank":70,"pax":33.0,"region":"Europa"},"ORY":{"name":"Paris-Orly","lat":48.72,"lon":2.38,"pop":5.0,"income":1.1,"biz":0.9,"tour":1.4,"land":8.7,"paxfee":23,"tax":7,"taxi":0.01,"country":"FR","rank":71,"pax":33.0,"region":"Europa"},"NKG":{"name":"Nanjing","lat":31.74,"lon":118.86,"pop":9.0,"income":0.45,"biz":1.0,"tour":0.9,"land":4.8,"paxfee":12,"tax":6,"taxi":0.01,"country":"CN","rank":72,"pax":32.0,"region":"Asien"},"CUN":{"name":"Cancún","lat":21.04,"lon":-86.88,"pop":1.0,"income":0.52,"biz":0.2,"tour":3.5,"land":4.8,"paxfee":24,"tax":15,"taxi":0.01,"country":"MX","rank":73,"pax":32.0,"region":"Lateinamerika"},"DTW":{"name":"Detroit","lat":42.21,"lon":-83.35,"pop":4.3,"income":1.35,"biz":1.0,"tour":0.6,"land":3.8,"paxfee":13,"tax":18,"taxi":0.01,"country":"US","rank":74,"pax":32.0,"region":"Nordamerika"},"PHL":{"name":"Philadelphia","lat":39.87,"lon":-75.24,"pop":6.2,"income":1.35,"biz":1.2,"tour":0.9,"land":3.8,"paxfee":13,"tax":18,"taxi":0.01,"country":"US","rank":75,"pax":32.0,"region":"Nordamerika"},"ATH":{"name":"Athen","lat":37.94,"lon":23.94,"pop":3.8,"income":0.6,"biz":0.8,"tour":1.8,"land":5.8,"paxfee":21,"tax":0,"taxi":0.01,"country":"GR","rank":76,"pax":32.0,"region":"Europa"},"KIX":{"name":"Osaka-Kansai","lat":34.43,"lon":135.24,"pop":15.0,"income":0.95,"biz":1.2,"tour":1.5,"land":8.6,"paxfee":21,"tax":7,"taxi":0.0,"country":"JP","rank":77,"pax":31.0,"region":"Asien"},"CTU":{"name":"Chengdu-Shuangliu","lat":30.58,"lon":103.95,"pop":9.0,"income":0.45,"biz":1.1,"tour":1.0,"land":4.8,"paxfee":11,"tax":6,"taxi":0.0,"country":"CN","rank":78,"pax":31.0,"region":"Asien"},"ZRH":{"name":"Zürich","lat":47.46,"lon":8.55,"pop":2.0,"income":1.5,"biz":1.5,"tour":1.3,"land":8.6,"paxfee":29,"tax":0,"taxi":0.0,"country":"CH","rank":79,"pax":31.0,"region":"Europa"},"CSX":{"name":"Changsha","lat":28.19,"lon":113.22,"pop":10.0,"income":0.45,"biz":0.8,"tour":0.9,"land":4.8,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":80,"pax":30.0,"region":"Asien"},"WUH":{"name":"Wuhan","lat":30.78,"lon":114.21,"pop":12.0,"income":0.45,"biz":0.9,"tour":0.8,"land":4.8,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":81,"pax":30.0,"region":"Asien"},"CAI":{"name":"Kairo","lat":30.12,"lon":31.41,"pop":22.0,"income":0.2,"biz":0.9,"tour":1.5,"land":3.8,"paxfee":14,"tax":10,"taxi":0,"country":"EG","rank":82,"pax":30.0,"region":"Nahost & Afrika"},"CPH":{"name":"Kopenhagen","lat":55.62,"lon":12.66,"pop":2.1,"income":1.3,"biz":1.2,"tour":1.2,"land":6.6,"paxfee":21,"tax":0,"taxi":0,"country":"DK","rank":83,"pax":30.0,"region":"Europa"},"MAN":{"name":"Manchester","lat":53.35,"lon":-2.27,"pop":3.5,"income":1.15,"biz":0.9,"tour":0.9,"land":8.5,"paxfee":28,"tax":15,"taxi":0,"country":"GB","rank":84,"pax":30.0,"region":"Europa"},"AUH":{"name":"Abu Dhabi","lat":24.43,"lon":54.65,"pop":1.5,"income":1.2,"biz":1.1,"tour":1.0,"land":4.7,"paxfee":19,"tax":10,"taxi":0,"country":"AE","rank":85,"pax":29.0,"region":"Nahost & Afrika"},"XMN":{"name":"Xiamen","lat":24.54,"lon":118.13,"pop":5.0,"income":0.45,"biz":0.9,"tour":1.2,"land":4.7,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":86,"pax":29.0,"region":"Asien"},"CJU":{"name":"Jeju","lat":33.51,"lon":126.49,"pop":0.7,"income":0.9,"biz":0.2,"tour":2.5,"land":5.7,"paxfee":14,"tax":7,"taxi":0,"country":"KR","rank":87,"pax":29.0,"region":"Asien"},"HAN":{"name":"Hanoi","lat":21.22,"lon":105.81,"pop":8.5,"income":0.25,"biz":1.0,"tour":1.1,"land":3.8,"paxfee":11,"tax":4,"taxi":0,"country":"VN","rank":88,"pax":29.0,"region":"Asien"},"TAO":{"name":"Qingdao","lat":36.36,"lon":120.09,"pop":10.0,"income":0.45,"biz":0.9,"tour":1.1,"land":4.7,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":89,"pax":29.0,"region":"Asien"},"DMK":{"name":"Bangkok-Don Mueang","lat":13.91,"lon":100.61,"pop":5.0,"income":0.35,"biz":0.6,"tour":1.2,"land":3.8,"paxfee":14,"tax":4,"taxi":0,"country":"TH","rank":90,"pax":29.0,"region":"Asien"},"HYD":{"name":"Hyderabad","lat":17.24,"lon":78.43,"pop":10.0,"income":0.18,"biz":1.0,"tour":0.7,"land":3.8,"paxfee":8,"tax":4,"taxi":0,"country":"IN","rank":91,"pax":29.0,"region":"Asien"},"SLC":{"name":"Salt Lake City","lat":40.79,"lon":-111.98,"pop":2.5,"income":1.35,"biz":0.9,"tour":1.0,"land":3.8,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":92,"pax":28.0,"region":"Nordamerika"},"SCL":{"name":"Santiago de Chile","lat":-33.39,"lon":-70.79,"pop":7.0,"income":0.62,"biz":1.0,"tour":0.9,"land":4.7,"paxfee":21,"tax":12,"taxi":0,"country":"CL","rank":93,"pax":27.0,"region":"Lateinamerika"},"YVR":{"name":"Vancouver","lat":49.19,"lon":-123.18,"pop":2.7,"income":1.15,"biz":1.1,"tour":1.3,"land":5.6,"paxfee":23,"tax":15,"taxi":0,"country":"CA","rank":94,"pax":27.0,"region":"Nordamerika"},"BWI":{"name":"Baltimore","lat":39.18,"lon":-76.67,"pop":2.8,"income":1.35,"biz":0.9,"tour":0.8,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":95,"pax":27.0,"region":"Nordamerika"},"IAD":{"name":"Washington-Dulles","lat":38.95,"lon":-77.46,"pop":3.5,"income":1.35,"biz":1.3,"tour":0.9,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":96,"pax":26.0,"region":"Nordamerika"},"DCA":{"name":"Washington-Reagan","lat":38.85,"lon":-77.04,"pop":3.5,"income":1.35,"biz":1.6,"tour":1.0,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":97,"pax":26.0,"region":"Nordamerika"},"LIM":{"name":"Lima","lat":-12.02,"lon":-77.11,"pop":11.0,"income":0.42,"biz":1.0,"tour":1.0,"land":3.7,"paxfee":18,"tax":12,"taxi":0,"country":"PE","rank":98,"pax":25.0,"region":"Lateinamerika"},"SAN":{"name":"San Diego","lat":32.73,"lon":-117.19,"pop":3.3,"income":1.35,"biz":1.0,"tour":1.5,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":99,"pax":25.0,"region":"Nordamerika"},"TPA":{"name":"Tampa","lat":27.98,"lon":-82.53,"pop":3.2,"income":1.35,"biz":0.8,"tour":1.6,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":100,"pax":25.0,"region":"Nordamerika"},"VIE":{"name":"Wien","lat":48.11,"lon":16.57,"pop":3.0,"income":1.05,"biz":1.0,"tour":1.2,"land":8,"paxfee":25,"tax":12,"taxi":0.0,"country":"AT","rank":null,"pax":32.0,"region":"Europa"},"BER":{"name":"Berlin","lat":52.37,"lon":13.5,"pop":6.0,"income":0.95,"biz":1.0,"tour":1.3,"land":6,"paxfee":18,"tax":15,"taxi":0.0,"country":"DE","rank":null,"pax":25.0,"region":"Europa"},"DUS":{"name":"Düsseldorf","lat":51.29,"lon":6.77,"pop":7.0,"income":1.0,"biz":1.1,"tour":0.5,"land":7,"paxfee":19,"tax":15,"taxi":0.0,"country":"DE","rank":null,"pax":20.0,"region":"Europa"},"HAM":{"name":"Hamburg","lat":53.63,"lon":9.99,"pop":3.2,"income":1.1,"biz":1.0,"tour":0.9,"land":7,"paxfee":17,"tax":15,"taxi":0.0,"country":"DE","rank":null,"pax":15.0,"region":"Europa"}};
  const AIRPORT_X_DATA = {"ATL":{"cost":1.68,"fuel":0.95,"hand":1.43,"slots":null,"slotFee":0},"DXB":{"cost":1.68,"fuel":0.9,"hand":1.27,"slots":8,"slotFee":150},"HND":{"cost":1.96,"fuel":1.05,"hand":1.51,"slots":4,"slotFee":300},"DFW":{"cost":1.65,"fuel":0.95,"hand":1.35,"slots":null,"slotFee":0},"PVG":{"cost":1.23,"fuel":1.05,"hand":0.98,"slots":8,"slotFee":120},"ORD":{"cost":1.64,"fuel":0.95,"hand":1.35,"slots":null,"slotFee":0},"LHR":{"cost":2.0,"fuel":1.06,"hand":1.3,"slots":4,"slotFee":400},"IST":{"cost":1.09,"fuel":1.0,"hand":0.98,"slots":8,"slotFee":100},"CAN":{"cost":1.22,"fuel":1.05,"hand":0.98,"slots":8,"slotFee":100},"DEN":{"cost":1.62,"fuel":0.95,"hand":1.33,"slots":null,"slotFee":0},"DEL":{"cost":0.79,"fuel":1.2,"hand":0.71,"slots":8,"slotFee":80},"ICN":{"cost":1.29,"fuel":1.03,"hand":1.05,"slots":8,"slotFee":100},"LAX":{"cost":1.55,"fuel":0.95,"hand":1.29,"slots":null,"slotFee":0},"CDG":{"cost":1.5,"fuel":1.03,"hand":1.15,"slots":8,"slotFee":150},"PEK":{"cost":1.15,"fuel":1.05,"hand":0.92,"slots":6,"slotFee":150},"SIN":{"cost":1.77,"fuel":1.0,"hand":1.26,"slots":8,"slotFee":150},"AMS":{"cost":1.4,"fuel":1.02,"hand":1.1,"slots":6,"slotFee":150},"MAD":{"cost":1.25,"fuel":1.03,"hand":1.08,"slots":8,"slotFee":120},"SZX":{"cost":1.12,"fuel":1.05,"hand":0.9,"slots":8,"slotFee":80},"KUL":{"cost":0.85,"fuel":1.0,"hand":0.78,"slots":10,"slotFee":60},"FRA":{"cost":1.3,"fuel":1.02,"hand":1.1,"slots":6,"slotFee":150},"BKK":{"cost":0.85,"fuel":1.03,"hand":0.78,"slots":8,"slotFee":100},"JFK":{"cost":1.46,"fuel":0.95,"hand":1.23,"slots":6,"slotFee":300},"HKG":{"cost":1.81,"fuel":1.03,"hand":1.33,"slots":6,"slotFee":200},"MCO":{"cost":1.42,"fuel":0.95,"hand":1.2,"slots":null,"slotFee":0},"BCN":{"cost":1.0,"fuel":1.03,"hand":0.95,"slots":null,"slotFee":0},"TFU":{"cost":1.06,"fuel":1.05,"hand":0.87,"slots":null,"slotFee":0},"BOM":{"cost":0.7,"fuel":1.2,"hand":0.65,"slots":4,"slotFee":100},"MIA":{"cost":1.4,"fuel":0.95,"hand":1.18,"slots":null,"slotFee":0},"LAS":{"cost":1.4,"fuel":0.95,"hand":1.18,"slots":null,"slotFee":0},"CGK":{"cost":0.7,"fuel":1.08,"hand":0.64,"slots":8,"slotFee":60},"SFO":{"cost":1.4,"fuel":0.95,"hand":1.18,"slots":null,"slotFee":0},"DOH":{"cost":1.39,"fuel":0.9,"hand":1.07,"slots":10,"slotFee":100},"CLT":{"cost":1.39,"fuel":0.95,"hand":1.18,"slots":null,"slotFee":0},"PKX":{"cost":1.04,"fuel":1.05,"hand":0.86,"slots":10,"slotFee":80},"JED":{"cost":1.15,"fuel":0.85,"hand":0.96,"slots":null,"slotFee":0},"SEA":{"cost":1.38,"fuel":0.95,"hand":1.17,"slots":null,"slotFee":0},"MNL":{"cost":0.69,"fuel":1.08,"hand":0.64,"slots":6,"slotFee":80},"PHX":{"cost":1.38,"fuel":0.95,"hand":1.17,"slots":null,"slotFee":0},"FCO":{"cost":1.1,"fuel":1.03,"hand":1.0,"slots":null,"slotFee":0},"HGH":{"cost":1.02,"fuel":1.05,"hand":0.84,"slots":null,"slotFee":0},"SHA":{"cost":1.02,"fuel":1.05,"hand":0.84,"slots":4,"slotFee":150},"CKG":{"cost":1.02,"fuel":1.05,"hand":0.84,"slots":null,"slotFee":0},"KMG":{"cost":1.02,"fuel":1.05,"hand":0.84,"slots":null,"slotFee":0},"XIY":{"cost":1.01,"fuel":1.05,"hand":0.84,"slots":null,"slotFee":0},"SAW":{"cost":0.9,"fuel":1.0,"hand":0.83,"slots":null,"slotFee":0},"IAH":{"cost":1.34,"fuel":0.95,"hand":1.14,"slots":null,"slotFee":0},"TPE":{"cost":1.12,"fuel":1.03,"hand":0.94,"slots":8,"slotFee":80},"YYZ":{"cost":1.22,"fuel":1.0,"hand":1.09,"slots":null,"slotFee":0},"GRU":{"cost":0.89,"fuel":1.1,"hand":0.83,"slots":8,"slotFee":80},"EWR":{"cost":1.35,"fuel":0.95,"hand":1.15,"slots":6,"slotFee":200},"MEX":{"cost":0.88,"fuel":1.05,"hand":0.82,"slots":4,"slotFee":100},"BOG":{"cost":0.77,"fuel":1.1,"hand":0.82,"slots":null,"slotFee":0},"BOS":{"cost":1.3,"fuel":0.95,"hand":1.12,"slots":null,"slotFee":0},"LGW":{"cost":1.41,"fuel":1.06,"hand":1.22,"slots":6,"slotFee":150},"MUC":{"cost":1.3,"fuel":1.02,"hand":1.08,"slots":8,"slotFee":120},"BLR":{"cost":0.64,"fuel":1.2,"hand":0.6,"slots":null,"slotFee":0},"SVO":{"cost":0.96,"fuel":0.95,"hand":0.85,"slots":null,"slotFee":0},"SYD":{"cost":1.4,"fuel":1.05,"hand":1.21,"slots":6,"slotFee":150},"SGN":{"cost":0.64,"fuel":1.05,"hand":0.6,"slots":null,"slotFee":0},"NRT":{"cost":1.47,"fuel":1.05,"hand":1.19,"slots":8,"slotFee":120},"AYT":{"cost":0.84,"fuel":1.0,"hand":0.79,"slots":null,"slotFee":0},"RUH":{"cost":1.05,"fuel":0.85,"hand":0.89,"slots":null,"slotFee":0},"MSP":{"cost":1.26,"fuel":0.95,"hand":1.08,"slots":null,"slotFee":0},"MEL":{"cost":1.36,"fuel":1.05,"hand":1.18,"slots":null,"slotFee":0},"FLL":{"cost":1.24,"fuel":0.95,"hand":1.07,"slots":null,"slotFee":0},"LIS":{"cost":0.85,"fuel":1.04,"hand":0.9,"slots":null,"slotFee":0},"LGA":{"cost":1.22,"fuel":0.95,"hand":1.06,"slots":4,"slotFee":250},"PMI":{"cost":0.9,"fuel":1.05,"hand":0.95,"slots":null,"slotFee":0},"DUB":{"cost":1.12,"fuel":1.03,"hand":0.96,"slots":8,"slotFee":80},"ORY":{"cost":1.33,"fuel":1.03,"hand":1.06,"slots":6,"slotFee":120},"NKG":{"cost":0.91,"fuel":1.05,"hand":0.77,"slots":null,"slotFee":0},"CUN":{"cost":0.81,"fuel":1.05,"hand":0.77,"slots":null,"slotFee":0},"DTW":{"cost":1.22,"fuel":0.95,"hand":1.06,"slots":null,"slotFee":0},"PHL":{"cost":1.22,"fuel":0.95,"hand":1.06,"slots":null,"slotFee":0},"ATH":{"cost":0.91,"fuel":1.04,"hand":0.86,"slots":null,"slotFee":0},"KIX":{"cost":1.41,"fuel":1.05,"hand":1.15,"slots":null,"slotFee":0},"CTU":{"cost":0.91,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"ZRH":{"cost":1.61,"fuel":1.03,"hand":1.24,"slots":6,"slotFee":150},"CSX":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"WUH":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"CAI":{"cost":0.6,"fuel":1.0,"hand":0.66,"slots":null,"slotFee":0},"CPH":{"cost":1.2,"fuel":1.02,"hand":1.04,"slots":null,"slotFee":0},"MAN":{"cost":1.3,"fuel":1.06,"hand":1.14,"slots":null,"slotFee":0},"AUH":{"cost":1.2,"fuel":0.9,"hand":0.94,"slots":null,"slotFee":0},"XMN":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"CJU":{"cost":1.0,"fuel":1.03,"hand":0.85,"slots":null,"slotFee":0},"HAN":{"cost":0.6,"fuel":1.05,"hand":0.57,"slots":null,"slotFee":0},"TAO":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"DMK":{"cost":0.7,"fuel":1.03,"hand":0.66,"slots":null,"slotFee":0},"HYD":{"cost":0.6,"fuel":1.2,"hand":0.57,"slots":null,"slotFee":0},"SLC":{"cost":1.2,"fuel":0.95,"hand":1.03,"slots":null,"slotFee":0},"SCL":{"cost":0.8,"fuel":1.1,"hand":0.79,"slots":null,"slotFee":0},"YVR":{"cost":1.1,"fuel":1.0,"hand":0.98,"slots":null,"slotFee":0},"BWI":{"cost":1.2,"fuel":0.95,"hand":1.03,"slots":null,"slotFee":0},"IAD":{"cost":1.2,"fuel":0.95,"hand":1.02,"slots":null,"slotFee":0},"DCA":{"cost":1.2,"fuel":0.95,"hand":1.02,"slots":4,"slotFee":200},"LIM":{"cost":0.7,"fuel":1.1,"hand":0.74,"slots":null,"slotFee":0},"SAN":{"cost":1.2,"fuel":0.95,"hand":1.02,"slots":null,"slotFee":0},"TPA":{"cost":1.2,"fuel":0.95,"hand":1.02,"slots":null,"slotFee":0},"VIE":{"cost":1.1,"fuel":1.01,"hand":1.0,"slots":null,"slotFee":0},"BER":{"cost":1.0,"fuel":1.0,"hand":1.0,"slots":null,"slotFee":0},"DUS":{"cost":1.1,"fuel":1.0,"hand":1.0,"slots":null,"slotFee":0},"HAM":{"cost":1.0,"fuel":1.0,"hand":1.0,"slots":null,"slotFee":0}};
  const COUNTRY_DATA = {"US":{"dat":"den USA","nom":"USA","region":"Nordamerika","taxLong":40},"CA":{"dat":"Kanada","nom":"Kanada","region":"Nordamerika","taxLong":30},"MX":{"dat":"Mexiko","nom":"Mexiko","region":"Lateinamerika","taxLong":40},"CO":{"dat":"Kolumbien","nom":"Kolumbien","region":"Lateinamerika","taxLong":35},"PE":{"dat":"Peru","nom":"Peru","region":"Lateinamerika","taxLong":30},"CL":{"dat":"Chile","nom":"Chile","region":"Lateinamerika","taxLong":30},"BR":{"dat":"Brasilien","nom":"Brasilien","region":"Lateinamerika","taxLong":25},"GB":{"dat":"Großbritannien","nom":"Großbritannien","region":"Europa","taxLong":95},"FR":{"dat":"Frankreich","nom":"Frankreich","region":"Europa","taxLong":30},"ES":{"dat":"Spanien","nom":"Spanien","region":"Europa","taxLong":0},"IT":{"dat":"Italien","nom":"Italien","region":"Europa","taxLong":7},"PT":{"dat":"Portugal","nom":"Portugal","region":"Europa","taxLong":0},"NL":{"dat":"den Niederlanden","nom":"Niederlande","region":"Europa","taxLong":29},"DE":{"dat":"Deutschland","nom":"Deutschland","region":"Europa","taxLong":60},"AT":{"dat":"Österreich","nom":"Österreich","region":"Europa","taxLong":12},"CH":{"dat":"der Schweiz","nom":"Schweiz","region":"Europa","taxLong":0},"IE":{"dat":"Irland","nom":"Irland","region":"Europa","taxLong":0},"DK":{"dat":"Dänemark","nom":"Dänemark","region":"Europa","taxLong":0},"GR":{"dat":"Griechenland","nom":"Griechenland","region":"Europa","taxLong":0},"TR":{"dat":"der Türkei","nom":"Türkei","region":"Europa","taxLong":10},"RU":{"dat":"Russland","nom":"Russland","region":"Europa","taxLong":0},"AE":{"dat":"den Vereinigten Arabischen Emiraten","nom":"VAE","region":"Nahost & Afrika","taxLong":10},"QA":{"dat":"Katar","nom":"Katar","region":"Nahost & Afrika","taxLong":10},"SA":{"dat":"Saudi-Arabien","nom":"Saudi-Arabien","region":"Nahost & Afrika","taxLong":20},"EG":{"dat":"Ägypten","nom":"Ägypten","region":"Nahost & Afrika","taxLong":25},"IN":{"dat":"Indien","nom":"Indien","region":"Asien","taxLong":8},"CN":{"dat":"China","nom":"China","region":"Asien","taxLong":12},"HK":{"dat":"Hongkong","nom":"Hongkong","region":"Asien","taxLong":15},"TW":{"dat":"Taiwan","nom":"Taiwan","region":"Asien","taxLong":10},"KR":{"dat":"Südkorea","nom":"Südkorea","region":"Asien","taxLong":7},"JP":{"dat":"Japan","nom":"Japan","region":"Asien","taxLong":7},"SG":{"dat":"Singapur","nom":"Singapur","region":"Asien","taxLong":8},"MY":{"dat":"Malaysia","nom":"Malaysia","region":"Asien","taxLong":8},"TH":{"dat":"Thailand","nom":"Thailand","region":"Asien","taxLong":8},"ID":{"dat":"Indonesien","nom":"Indonesien","region":"Asien","taxLong":8},"PH":{"dat":"den Philippinen","nom":"Philippinen","region":"Asien","taxLong":25},"VN":{"dat":"Vietnam","nom":"Vietnam","region":"Asien","taxLong":8},"AU":{"dat":"Australien","nom":"Australien","region":"Ozeanien","taxLong":40}};
  const SEASON_DATA = {"PMI":"island","BCN":"sun","FCO":"sun","LIS":"sun","AYT":"island","CJU":"sun","ATH":"sun","CUN":"winter_sun","MCO":"winter_sun","MIA":"winter_sun","FLL":"winter_sun","TPA":"winter_sun","LAS":"city","BKK":"winter_sun","DMK":"winter_sun","DXB":"winter_sun","AUH":"winter_sun","SYD":"sun","MEL":"sun","SAN":"sun","CAI":"winter_sun"};
  const REGION_ORDER = ["Europa", "Nordamerika", "Lateinamerika", "Nahost & Afrika", "Asien", "Ozeanien"];
  // @@AIRPORTS-END
  const P = {
    VERSION: 'econ-0.4.0',
    AIRPORTS: AIRPORT_DATA,
    AIRPORT_X: AIRPORT_X_DATA,
    REGIONS: Object.fromEntries(REGION_ORDER.map((r) => [r, Object.keys(AIRPORT_DATA).filter((c) => AIRPORT_DATA[c].region === r)])),
    LEISURE_SEASON_PROFILE: SEASON_DATA,
    INTERCONT: 0.6, MIN_ROUTE_KM: 300, LONGHAUL_TAX_KM: 3000,
    RAIL_TIME_H: {
      'HAM-BER': 1.8, 'HAM-FRA': 3.6, 'HAM-MUC': 5.7, 'HAM-DUS': 3.4, 'BER-FRA': 4.0, 'BER-MUC': 4.0,
      'BER-DUS': 4.2, 'FRA-MUC': 3.2, 'FRA-DUS': 1.6, 'MUC-DUS': 4.8, 'LHR-CDG': 2.3, 'LHR-AMS': 4.0,
      'CDG-AMS': 3.3, 'AMS-DUS': 2.2, 'CDG-FRA': 3.8, 'AMS-FRA': 3.9, 'MUC-VIE': 4.0, 'CDG-DUS': 4.3,
      'HAM-AMS': 5.2, 'CDG-BCN': 6.5, 'BER-VIE': 7.8, 'BER-AMS': 6.2,
      'MAD-BCN': 2.6, 'LHR-ORY': 2.6, 'LGW-CDG': 2.6, 'LGW-AMS': 4.2, 'ZRH-MUC': 3.6, 'ZRH-FRA': 4.0, 'ZRH-CDG': 4.1, 'ORY-AMS': 3.5, 'ORY-BCN': 6.6, 'VIE-MUC': 4.0,
      'PEK-SHA': 4.6, 'PEK-PVG': 5.0, 'PKX-SHA': 4.8, 'PKX-PVG': 5.2, 'PEK-XIY': 4.5, 'PKX-XIY': 4.7, 'CAN-CSX': 2.4, 'CAN-WUH': 4.0, 'SZX-CSX': 2.9, 'WUH-PEK': 4.5, 'NKG-PEK': 3.5, 'NKG-PKX': 3.7, 'TAO-PEK': 3.0, 'TAO-PKX': 3.2,
      'HND-KIX': 2.8, 'NRT-KIX': 3.2, 'CKG-TFU': 1.4, 'CKG-CTU': 1.4, 'XIY-CTU': 3.5, 'XIY-TFU': 3.7, 'HGH-NKG': 1.5, 'BOS-LGA': 3.8, 'BOS-JFK': 3.9, 'BOS-EWR': 3.8, 'DCA-LGA': 3.1, 'DCA-JFK': 3.2, 'IAD-LGA': 3.4, 'BWI-LGA': 2.8, 'DCA-BOS': 6.5, 'PHL-BOS': 5.0, 'PHL-DCA': 1.9, 'PHL-IAD': 2.2, 'SEA-YVR': 4.0,
    },
    RAIL_SHARE_MAX: 0.90, RAIL_SHARE_SLOPE: 1.0, ACCESS_TIME_AIR_H: 2.5,
    VFR_TIES: { 'BER-FCO': 1.3, 'DUS-FCO': 1.3, 'FRA-FCO': 1.3, 'MUC-FCO': 1.4, 'LHR-LIS': 1.5, 'CDG-LIS': 1.8, 'DUS-LIS': 1.3, 'LHR-PMI': 1.2, 'BER-VIE': 1.2, 'MUC-VIE': 1.3 },
    ROUTE_DETOUR: 1.05,
    FUEL_USD_KG: 0.88, EURUSD: 1.10,
    SEGMENTS: ['leisure', 'business', 'vfr'],
    GRAVITY: { leisure: { K: 95, e: -0.2 }, business: { K: 20, e: -0.6 }, vfr: { K: 16, e: -0.5 } },
    GRAVITY_MIN_DIST_KM: 300,
    REF_PRICE_BASE: 50, REF_PRICE_PER_KM: 0.055,
    CHOICE: {
      leisure: { b_price: -3.2, b_freq: 0.25, b_service: 0.30, b_otp: 1.0, b_brand: 0.40, asc_out: -0.20, econ: 0.8 },
      business: { b_price: -1.3, b_freq: 0.85, b_service: 0.60, b_otp: 2.0, b_brand: 0.60, asc_out: 0.20, econ: 1.6 },
      vfr: { b_price: -2.2, b_freq: 0.35, b_service: 0.30, b_otp: 1.0, b_brand: 0.30, asc_out: -0.20, econ: 0.4 },
    },
    BRAND_NEUTRAL: 0.6,
    NEST_MU: 0.6,
    INDIRECT: { min_dist_km: 900, price_vs_ref: 1.05, freq: 4, service: 'standard', otp: 0.75, penalty: { leisure: -0.9, business: -1.6, vfr: -0.9 } },
    TRANSFER: { min_dist_km: 400, max_detour: 1.5, discount: 0.80, penalty: { leisure: -0.7, business: -1.3, vfr: -0.7 } },
    ANCILLARY_PRICE_WEIGHT: 0.6,
    RAMP_R0: 0.35, RAMP_T_DAYS: 30,
    DEMAND_NOISE_SIGMA_OD: 0.12, DEMAND_NOISE_SIGMA_SEG: 0.06, TREND_SIGMA: 0.12,
    DOW: { leisure: [0.95, 0.85, 0.88, 1.00, 1.15, 1.05, 1.12], business: [1.20, 1.05, 1.05, 1.15, 1.05, 0.45, 1.05], vfr: [0.90, 0.85, 0.85, 1.00, 1.20, 1.00, 1.20] },
    SEASON_PROFILES: {
      island: [0.45, 0.50, 0.75, 1.00, 1.20, 1.40, 1.65, 1.70, 1.35, 1.00, 0.50, 0.50],
      winter_sun: [1.30, 1.35, 1.30, 1.10, 0.85, 0.80, 0.90, 0.90, 0.75, 0.90, 1.00, 1.30],
      sun: [0.70, 0.72, 0.85, 1.00, 1.08, 1.20, 1.38, 1.40, 1.18, 1.02, 0.75, 0.80],
      city: [0.80, 0.82, 0.95, 1.05, 1.05, 1.05, 1.10, 1.10, 1.05, 1.05, 0.95, 1.05],
      business: [0.95, 1.05, 1.10, 1.05, 1.05, 1.05, 0.85, 0.70, 1.05, 1.10, 1.10, 0.85],
      vfr: [0.95, 0.85, 0.95, 1.05, 0.95, 1.00, 1.10, 1.10, 0.95, 0.95, 0.90, 1.25],
    },
    SERVICE: {
      basic: { label: 'Basic', svc: 0.0, cost_pax: 1.0, ancillary: 18.0, distribution: 0.025, crew_factor: 0.95, turn_delta: -5 },
      standard: { label: 'Standard', svc: 0.5, cost_pax: 5.0, ancillary: 10.0, distribution: 0.040, crew_factor: 1.00, turn_delta: 0 },
      premium: { label: 'Premium', svc: 1.0, cost_pax: 14.0, ancillary: 4.0, distribution: 0.060, crew_factor: 1.10, turn_delta: 5 },
    },
    AIRCRAFT_TYPES: {
      AT76: { label: 'ATR 72-600', maker: 'ATR', cls: 'Turboprop', group: 'ATR', cabin: 2, seats: { basic: 72, standard: 70, premium: 64 }, range_km: 1500, speed_kmh: 480, mtow_t: 23,
        fuel_cycle_kg: 100, fuel_bh_kg: 620, crew_bh: 430, maint_bh: 300, maint_cycle: 160, handling: 550, cargo_kg: 600,
        turn_min: 25, value_eur: 26e6, lease_month: 180e3, dispatch_rel: 0.993, delay_cost_min: 18, acmi_day: 9000, age: 3,
        engines: '2 × Turboprop PW127', note: 'Sparsamster Sitz auf kurzen Strecken, langsam',
        ill: { kind: 'prop', len: 0.68, tt: true, fin: 'atr' } },
      DH8D: { label: 'Dash 8-400', maker: 'De Havilland Canada', cls: 'Schneller Turboprop', group: 'DH8', cabin: 2, seats: { basic: 80, standard: 76, premium: 70 }, range_km: 2000, speed_kmh: 560, mtow_t: 29,
        fuel_cycle_kg: 140, fuel_bh_kg: 900, crew_bh: 460, maint_bh: 380, maint_cycle: 190, handling: 600, cargo_kg: 800,
        turn_min: 25, value_eur: 30e6, lease_month: 175e3, dispatch_rel: 0.989, delay_cost_min: 20, acmi_day: 10500, age: 6,
        engines: '2 × Turboprop PW150A', note: 'Fast so schnell wie ein Jet bis 800 km, höherer Verbrauch als die ATR',
        ill: { kind: 'prop', len: 0.76, tt: true, fin: 'dash' } },
      E295: { label: 'Embraer E195-E2', maker: 'Embraer', cls: 'Regionaljet', group: 'EJET', cabin: 3, seats: { basic: 136, standard: 124, premium: 112 }, range_km: 4800, speed_kmh: 790, mtow_t: 62,
        fuel_cycle_kg: 300, fuel_bh_kg: 1580, crew_bh: 560, maint_bh: 520, maint_cycle: 240, handling: 850, cargo_kg: 1800,
        turn_min: 35, value_eur: 44e6, lease_month: 290e3, dispatch_rel: 0.995, delay_cost_min: 30, acmi_day: 17000, age: 2,
        engines: '2 × PW1900G', note: 'Kein Mittelsitz, beliebt bei Geschäftsreisenden',
        ill: { kind: 'jet', len: 0.80, fin: 'embraer' } },
      BCS3: { label: 'Airbus A220-300', maker: 'Airbus', cls: 'Kleiner Mittelstreckenjet', group: 'A220', cabin: 3, seats: { basic: 150, standard: 140, premium: 124 }, range_km: 6300, speed_kmh: 790, mtow_t: 70,
        fuel_cycle_kg: 330, fuel_bh_kg: 1720, crew_bh: 620, maint_bh: 560, maint_cycle: 250, handling: 950, cargo_kg: 2200,
        turn_min: 35, value_eur: 48e6, lease_month: 320e3, dispatch_rel: 0.993, delay_cost_min: 34, acmi_day: 20000, age: 2,
        engines: '2 × PW1500G', note: 'Sehr niedriger Verbrauch je Sitz in der 140er-Klasse',
        ill: { kind: 'jet', len: 0.85, fin: 'a220' } },
      A20N: { label: 'Airbus A320neo', maker: 'Airbus', cls: 'Mittelstrecke, neue Generation', group: 'A32F', cabin: 4, seats: { basic: 186, standard: 180, premium: 156 }, range_km: 6300, speed_kmh: 800, mtow_t: 79,
        fuel_cycle_kg: 420, fuel_bh_kg: 2000, crew_bh: 700, maint_bh: 620, maint_cycle: 260, handling: 1100, cargo_kg: 3000,
        turn_min: 40, value_eur: 52e6, lease_month: 350e3, dispatch_rel: 0.996, delay_cost_min: 40, acmi_day: 24000, age: 2,
        engines: '2 × CFM LEAP-1A', note: 'Das Arbeitspferd Europas, rund 15 % sparsamer als die ceo',
        ill: { kind: 'jet', len: 0.90, fin: 'airbus', neo: true } },
      A320: { label: 'Airbus A320ceo', maker: 'Airbus', cls: 'Mittelstrecke, ältere Generation', group: 'A32F', cabin: 4, seats: { basic: 186, standard: 180, premium: 156 }, range_km: 5700, speed_kmh: 800, mtow_t: 77,
        fuel_cycle_kg: 500, fuel_bh_kg: 2400, crew_bh: 700, maint_bh: 820, maint_cycle: 330, handling: 1100, cargo_kg: 3000,
        turn_min: 40, value_eur: 20e6, lease_month: 135e3, dispatch_rel: 0.990, delay_cost_min: 40, acmi_day: 21000, age: 15,
        engines: '2 × CFM56-5B', note: 'Günstig zu leasen, durstig und wartungsintensiver',
        ill: { kind: 'jet', len: 0.90, fin: 'airbus' } },
      A21N: { label: 'Airbus A321neo', maker: 'Airbus', cls: 'Große Mittelstrecke', group: 'A32F', cabin: 5, seats: { basic: 232, standard: 220, premium: 196 }, range_km: 7400, speed_kmh: 800, mtow_t: 97,
        fuel_cycle_kg: 520, fuel_bh_kg: 2350, crew_bh: 800, maint_bh: 700, maint_cycle: 300, handling: 1300, cargo_kg: 4000,
        turn_min: 45, value_eur: 62e6, lease_month: 420e3, dispatch_rel: 0.996, delay_cost_min: 48, acmi_day: 28000, age: 2,
        engines: '2 × CFM LEAP-1A', note: 'Niedrigste Kosten je Sitz, braucht volle Märkte',
        ill: { kind: 'jet', len: 1.0, fin: 'airbus', neo: true } },
      B738: { label: 'Boeing 737-800', maker: 'Boeing', cls: 'Mittelstrecke, ältere Generation', group: 'B737', cabin: 4, seats: { basic: 189, standard: 180, premium: 162 }, range_km: 5400, speed_kmh: 800, mtow_t: 79,
        fuel_cycle_kg: 510, fuel_bh_kg: 2450, crew_bh: 700, maint_bh: 800, maint_cycle: 320, handling: 1100, cargo_kg: 3200,
        turn_min: 40, value_eur: 24e6, lease_month: 160e3, dispatch_rel: 0.991, delay_cost_min: 40, acmi_day: 21000, age: 12,
        engines: '2 × CFM56-7B', note: 'Robust und weit verbreitet, gebraucht günstig',
        ill: { kind: 'jet', len: 0.90, fin: 'boeing' } },
      B38M: { label: 'Boeing 737 MAX 8', maker: 'Boeing', cls: 'Mittelstrecke, neue Generation', group: 'B737', cabin: 4, seats: { basic: 189, standard: 180, premium: 162 }, range_km: 6500, speed_kmh: 800, mtow_t: 82,
        fuel_cycle_kg: 430, fuel_bh_kg: 2050, crew_bh: 700, maint_bh: 640, maint_cycle: 265, handling: 1100, cargo_kg: 3200,
        turn_min: 40, value_eur: 50e6, lease_month: 330e3, dispatch_rel: 0.994, delay_cost_min: 40, acmi_day: 23500, age: 2,
        engines: '2 × CFM LEAP-1B', note: 'Sparsam, 189 Sitze im Low-Cost-Layout',
        ill: { kind: 'jet', len: 0.90, fin: 'boeing', neo: true } },
      A339: { label: 'Airbus A330-900neo', maker: 'Airbus', cls: 'Langstrecke, Großraum', group: 'A330', cabin: 8, seats: { basic: 360, standard: 300, premium: 260 }, range_km: 13300, speed_kmh: 840, mtow_t: 251,
        fuel_cycle_kg: 1600, fuel_bh_kg: 5600, crew_bh: 1500, maint_bh: 1300, maint_cycle: 900, handling: 3800, cargo_kg: 16000,
        turn_min: 75, value_eur: 115e6, lease_month: 900e3, dispatch_rel: 0.993, delay_cost_min: 110, acmi_day: 70000, age: 2, window: 22, yieldF: 1.08,
        engines: '2 × Rolls-Royce Trent 7000', note: 'Günstigster Einstieg in die Langstrecke, ideal bis 10 Stunden',
        ill: { kind: 'wide', len: 0.94, fin: 'airbus', neo: true } },
      A359: { label: 'Airbus A350-900', maker: 'Airbus', cls: 'Langstrecke, Großraum', group: 'A350', cabin: 9, seats: { basic: 350, standard: 315, premium: 280 }, range_km: 15000, speed_kmh: 850, mtow_t: 283,
        fuel_cycle_kg: 1700, fuel_bh_kg: 5800, crew_bh: 1600, maint_bh: 1250, maint_cycle: 850, handling: 4000, cargo_kg: 18000,
        turn_min: 80, value_eur: 150e6, lease_month: 1100e3, dispatch_rel: 0.995, delay_cost_min: 120, acmi_day: 85000, age: 2, window: 22, yieldF: 1.08,
        engines: '2 × Rolls-Royce Trent XWB', note: 'Sehr sparsam und reichweitenstark, auch für Ultralangstrecke',
        ill: { kind: 'wide', len: 0.97, fin: 'airbus', neo: true } },
      A35K: { label: 'Airbus A350-1000', maker: 'Airbus', cls: 'Langstrecke, Großraum', group: 'A350', cabin: 10, seats: { basic: 410, standard: 360, premium: 320 }, range_km: 16000, speed_kmh: 850, mtow_t: 319,
        fuel_cycle_kg: 2000, fuel_bh_kg: 6800, crew_bh: 1750, maint_bh: 1450, maint_cycle: 950, handling: 4500, cargo_kg: 22000,
        turn_min: 90, value_eur: 170e6, lease_month: 1300e3, dispatch_rel: 0.994, delay_cost_min: 135, acmi_day: 98000, age: 2, window: 22, yieldF: 1.08,
        engines: '2 × Rolls-Royce Trent XWB-97', note: 'Größter Zweistrahler von Airbus, für dichte Langstrecken',
        ill: { kind: 'wide', len: 1.0, fin: 'airbus', neo: true } },
      B789: { label: 'Boeing 787-9', maker: 'Boeing', cls: 'Langstrecke, Großraum', group: 'B787', cabin: 9, seats: { basic: 340, standard: 296, premium: 260 }, range_km: 14000, speed_kmh: 850, mtow_t: 254,
        fuel_cycle_kg: 1650, fuel_bh_kg: 5600, crew_bh: 1550, maint_bh: 1250, maint_cycle: 850, handling: 3900, cargo_kg: 17000,
        turn_min: 80, value_eur: 145e6, lease_month: 1050e3, dispatch_rel: 0.993, delay_cost_min: 115, acmi_day: 82000, age: 2, window: 22, yieldF: 1.08,
        engines: '2 × GEnx-1B', note: 'Öffnet dünne Langstrecken, die sich mit größeren Jets nicht lohnen',
        ill: { kind: 'wide', len: 0.95, fin: 'boeing', neo: true } },
      B77W: { label: 'Boeing 777-300ER', maker: 'Boeing', cls: 'Langstrecke, Großraum, ältere Generation', group: 'B777', cabin: 11, seats: { basic: 450, standard: 396, premium: 340 }, range_km: 13600, speed_kmh: 850, mtow_t: 351,
        fuel_cycle_kg: 2300, fuel_bh_kg: 7600, crew_bh: 1850, maint_bh: 1800, maint_cycle: 1200, handling: 4800, cargo_kg: 22000,
        turn_min: 90, value_eur: 75e6, lease_month: 600e3, dispatch_rel: 0.992, delay_cost_min: 145, acmi_day: 95000, age: 12, window: 22, yieldF: 1.08,
        engines: '2 × GE90-115B', note: 'Viele Sitze für wenig Leasing, aber durstig',
        ill: { kind: 'wide', len: 1.0, fin: 'boeing' } },
    },
    TYPE_GROUPS: { ATR: 'ATR 72', DH8: 'Dash 8', EJET: 'Embraer E2', A220: 'Airbus A220', A32F: 'Airbus A320-Familie', B737: 'Boeing 737', A330: 'Airbus A330', A350: 'Airbus A350', B787: 'Boeing 787', B777: 'Boeing 777' },
    AGE: { maint: 0.02, fuel: 0.003, fail: 1 / 15, value: 0.045, lease: 0.03 },
    TAXI_BASE_H: 0.30, CLIMB_DESCENT_OVERHEAD_H: 0.20, OPERATING_WINDOW_H: 17.0, CREW_MIN_BH_PER_DAY: 6.0,
    INSURANCE: { basic: { label: 'Basis', rate: 0.0015, deductible: 400e3 }, comfort: { label: 'Komfort', rate: 0.0035, deductible: 75e3 } },
    NAV_UNIT_RATE: 72.0, NAV_TERMINAL_RATE: 180.0,
    BUFFER_POLICY: {
      tight: { label: 'Knapp', extra_turn_min: 0, mean_delay_min: 14, otp: 0.72 },
      normal: { label: 'Normal', extra_turn_min: 15, mean_delay_min: 9, otp: 0.82 },
      robust: { label: 'Robust', extra_turn_min: 30, mean_delay_min: 6, otp: 0.88 },
    },
    CANCEL_CARE_COST_PAX: 60.0, EU261_COMP: [[1500, 250.0], [3500, 400.0]], EU261_CLAIM_RATE: 0.35,
    TERMINALS: {
      lcc: { label: 'Low-Cost-Bereich', desc: 'Außenposition mit Bus, einfache Schalter', rent: 4500, paxF: 0.75, turn: 10, u: { leisure: -0.03, business: -0.20, vfr: -0.03 } },
      std: { label: 'Standard-Terminal', desc: 'Gates und Schalter im Hauptterminal', rent: 9000, paxF: 1.00, turn: 0, u: { leisure: 0, business: 0, vfr: 0 } },
      prem: { label: 'Pier mit Lounge', desc: 'Fluggastbrücken, eigene Lounge, Priority-Schalter', rent: 22000, paxF: 1.12, turn: -5, u: { leisure: 0.04, business: 0.25, vfr: 0.04 } },
    },
    OWN_HANDLING_DAY: 2400, OWN_HANDLING_SHARE: 0.35, HANGAR_MONTH: 60000, HANGAR_MAINT: 0.94, HANGAR_CHECK_DAYS: 3,
    STAFF: {
      pilotSalary: { ATR: 10500, DH8: 11000, EJET: 12500, A220: 13500, A32F: 14500, B737: 14500, A330: 17000, A350: 18000, B787: 17500, B777: 18000 }, cabinSalary: 4600, techSalary: 6200,
      pilotH: 2.2, cabinH: 2.5, techPerAc: 3.5, techMaintShare: 0.12,
      recruit: { pilot: 9000, cabin: 1500, tech: 3500 }, lead: { pilot: 35, cabin: 12, tech: 21 },
      maxHire: { pilot: 24, cabin: 90, tech: 30 }, trainDays: 45, trainCost: 28000,
      agency: 1.6, overtime: 1.5, overtimeMax: 0.10, perDiem: 9, severanceMonths: 3, attrition: 0.01,
    },
    EXPERT_ROLES: {
      analyst: { label: 'Marktanalyse', salary: [7000, 11000, 17000], max: 2,
        effect: ['Marktstudien möglich, Prognoseband ±18 %', 'Marktstudien, Prognoseband ±12 %', 'Marktstudien, Prognoseband ±8 %'] },
      revenue: { label: 'Revenue Management', salary: [8000, 13000, 21000], max: 1,
        effect: ['Flex-Tarife: Geschäftsreisende zahlen +8 %', 'Flex-Tarife +15 %, Preisautomatik reagiert auf abgewiesene Nachfrage', 'Flex-Tarife +22 %, Preisautomatik reagiert auf abgewiesene Nachfrage'] },
      procurement: { label: 'Einkauf', salary: [7500, 12000, 18000], max: 1,
        effect: ['Kerosin −2 %, Abfertigung und Mieten −3 %, Hedging günstiger', 'Kerosin −4 %, Abfertigung und Mieten −6 %', 'Kerosin −6 %, Abfertigung und Mieten −9 %'] },
      ops: { label: 'Operations (OCC)', salary: [8000, 13000, 20000], max: 1,
        effect: ['Pünktlichkeit +3 Pkt., Wetterausfälle −20 %', 'Pünktlichkeit +5 Pkt., Wetterausfälle −35 %', 'Pünktlichkeit +8 Pkt., Wetterausfälle −50 %'] },
      tech: { label: 'Technik', salary: [8500, 13500, 21000], max: 1,
        effect: ['Defekte −20 %, Wartung −3 %, C-Check 1 Tag kürzer', 'Defekte −35 %, Wartung −5 %, C-Check 2 Tage kürzer', 'Defekte −50 %, Wartung −8 %, C-Check 3 Tage kürzer'] },
      hr: { label: 'Personal', salary: [6500, 10000, 15000], max: 1,
        effect: ['Einstellungen 25 % schneller, Stimmung +5 Pkt., Streikrisiko −30 %', 'Einstellungen 40 % schneller, Stimmung +10 Pkt., Streikrisiko −50 %', 'Einstellungen 50 % schneller, Stimmung +15 Pkt., Streikrisiko −65 %'] },
      finance: { label: 'Finanzen', salary: [9000, 15000, 24000], max: 1,
        effect: ['Kreditlinie +25 %, Zins −0,5 Pkt.', 'Kreditlinie +50 %, Zins −1,0 Pkt.', 'Kreditlinie +100 %, Zins −1,5 Pkt.'] },
      marketing: { label: 'Marketing', salary: [7000, 11500, 18000], max: 1,
        effect: ['Neue Strecken in 24 statt 30 Tagen bekannt, Werbung +30 % wirksamer', '20 Tage, Werbung +60 % wirksamer', '16 Tage, Werbung doppelt so wirksam'] },
    },
    STUDY_COST: 25000, STUDY_DAYS: [21, 14, 10], STUDY_ERR: [0.10, 0.05, 0.02],
    START_EQUITY_EUR: 20e6, OVERHEAD_PER_AIRCRAFT_DAY: 900.0, STATION_COST_DAY_AI: 600.0,
    STAGES: [
      { key: 'startup', label: 'Startup', min: 0, hq: 6000 },
      { key: 'regional', label: 'Regional', min: 6, hq: 12000 },
      { key: 'network', label: 'Netzwerk', min: 26, hq: 30000 },
      { key: 'international', label: 'International', min: 101, hq: 80000 },
    ],
    BASE_SETUP_COST: 400e3, BASE_FIXED_DAY: 2000.0, TYPE_INTRO_COST: 250e3, TYPE_COMPLEXITY_DAY: 1500.0,
    LEASE_DEPOSIT_MONTHS: 2, LEASE_MIN_TERM_MONTHS: 36, LEASE_EARLY_RETURN_MONTHS: 4, LEASE_RETURN_COST: 300e3,
    FLEX_LEASE_PREMIUM: 0.25, LEASE_DELIVERY_DAYS: 14, PURCHASE_DELIVERY_DAYS: 30, FACTORY_DELIVERY_DAYS: 180, PURCHASE_DOWNPAYMENT: 0.20,
    LOAN_TERM_YEARS: 12, DEPRECIATION_YEARS: 25, RESIDUAL_SHARE: 0.10,
    BASE_RATE: 0.025, CREDIT_LINE_BASE: 5e6, CREDIT_LINE_ASSET_SHARE: 0.10, TAX_RATE: 0.25,
    RATINGS: [
      { r: 'A', spread: 0.015, line: 3.0 }, { r: 'BBB', spread: 0.025, line: 2.0 }, { r: 'BB', spread: 0.040, line: 1.4 },
      { r: 'B', spread: 0.060, line: 1.0 }, { r: 'CCC', spread: 0.090, line: 0.5 },
    ],
    LIQUIDITY_WARN_DAYS: [14, 60], RESTRUCTURING_AFTER_DAYS: 7, INSOLVENCY_AFTER_DAYS: 30,
    PRICE_CHANGE_LAG_DAYS: 2, AUTO_PRICE: { gain: 0.6, max_step: 0.08 },
    FUEL_HEDGE: { premium: 0.030, contango: 0.006, maxShare: 0.8 },
    CCHECK_FH: 4500, CCHECK_DAYS: 10, AOG_MONTHLY: 0.008, AOG_DAYS: [4, 12], AOG_COST: [250e3, 900e3],
    CARGO: { k: 120, yield: 1.2, handling: 0.20, commission: 0.15, gsaMonth: 8000, loadMax: 0.8 },
    MARKETING_K: 0.04, BRAND_DECAY: 0.015,
    AI_ARCHETYPES: {
      lcc: { label: 'Low-Cost', service: 'basic', buffer: 'tight', target_lf: 0.90, price_vs_ref: 0.80, undercut: 0.10, pref_types: ['A20N'], min_margin: 0.00, forecast_sigma: 0.20, brand: 0.6, cargo: false },
      premium: { label: 'Premium-Netz', service: 'premium', buffer: 'robust', target_lf: 0.78, price_vs_ref: 1.15, undercut: 0.00, pref_types: ['A20N', 'E295'], min_margin: 0.03, forecast_sigma: 0.15, brand: 0.7, cargo: true },
      regional: { label: 'Regional', service: 'standard', buffer: 'normal', target_lf: 0.78, price_vs_ref: 1.05, undercut: 0.00, pref_types: ['AT76', 'DH8D', 'E295'], min_margin: 0.02, forecast_sigma: 0.15, brand: 0.6, cargo: true },
      leisure: { label: 'Ferienflieger', service: 'basic', buffer: 'normal', target_lf: 0.92, price_vs_ref: 0.85, undercut: 0.05, pref_types: ['A21N'], min_margin: 0.00, forecast_sigma: 0.20, brand: 0.6, cargo: false },
    },
    AI_BASE_EXPANSION: { lcc: { max_bases: 3, hurdle_day: 6000 }, premium: { max_bases: 2, hurdle_day: 10000 } },
  };
  const AP_CODES = Object.keys(P.AIRPORTS);
  const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  const COUNTRIES = [...new Set(AP_CODES.map((c) => P.AIRPORTS[c].country))];
  const COUNTRY_LABEL = Object.fromEntries(Object.entries(COUNTRY_DATA).map(([k, v]) => [k, v.nom]));
  const COUNTRY_NAMES = Object.fromEntries(Object.entries(COUNTRY_DATA).map(([k, v]) => [k, v.dat]));

  // ===========================================================================
  // Zufall und Helfer
  // ===========================================================================
  class Rng {
    constructor(seed) { this.s = seed >>> 0; }
    random() {
      let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    gauss(mu, sigma) { let u = 0; while (u === 0) u = this.random(); const v = this.random(); return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    expo(lambda) { return -Math.log(1 - this.random()) / lambda; }
    pick(arr) { return arr[Math.floor(this.random() * arr.length)]; }
    int(a, b) { return a + Math.floor(this.random() * (b - a + 1)); }
    range(a, b) { return a + (b - a) * this.random(); }
  }
  const hashStr = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sumObj = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const pairKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const lv3 = (arr, lv) => arr[lv] ?? 0;

  // ===========================================================================
  // Modell
  // ===========================================================================
  const ap = (c) => P.AIRPORTS[c];
  const apx = (c) => P.AIRPORT_X[c];
  const _dist = {};
  function gcDistanceKm(a, b) {
    const k = pairKey(a, b);
    if (_dist[k] !== undefined) return _dist[k];
    const A = ap(a), B = ap(b), R = 6371, rad = Math.PI / 180;
    const p1 = A.lat * rad, p2 = B.lat * rad, dp = p2 - p1, dl = (B.lon - A.lon) * rad;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return (_dist[k] = 2 * R * Math.asin(Math.sqrt(h)));
  }
  function blockHours(o, d, typeId) {
    const t = P.AIRCRAFT_TYPES[typeId];
    return P.TAXI_BASE_H + ap(o).taxi + ap(d).taxi + P.CLIMB_DESCENT_OVERHEAD_H + gcDistanceKm(o, d) * P.ROUTE_DETOUR / t.speed_kmh;
  }
  const refPrice = (o, d, cpi = 1) => { const k = gcDistanceKm(o, d); return (P.REF_PRICE_BASE + P.REF_PRICE_PER_KM * k + 0.02 * Math.max(0, k - 4000)) * cpi; };
  function railTime(o, d) { const v = P.RAIL_TIME_H[o + '-' + d] ?? P.RAIL_TIME_H[d + '-' + o]; return v === undefined ? null : v; }
  function railShare(o, d) {
    const tr = railTime(o, d);
    if (tr === null) return 0;
    const ta = blockHours(o, d, 'A20N') + P.ACCESS_TIME_AIR_H;
    return P.RAIL_SHARE_MAX / (1 + Math.exp(P.RAIL_SHARE_SLOPE * (tr - ta)));
  }
  const accessibility = (o, d) => 1 - railShare(o, d);
  function tripGeneration(o, d) {
    const A = ap(o), B = ap(d);
    const dist = Math.max(gcDistanceKm(o, d), P.GRAVITY_MIN_DIST_KM) / 1000;
    const ties = P.VFR_TIES[o + '-' + d] ?? P.VFR_TIES[d + '-' + o] ?? 1.0;
    const g = P.GRAVITY, ic = A.region !== B.region ? P.INTERCONT : 1;
    return {
      leisure: ic * g.leisure.K * A.pop ** 0.8 * A.income ** 1.5 * B.tour * B.pop ** 0.2 * dist ** g.leisure.e,
      business: ic * g.business.K * (A.pop * B.pop) ** 0.5 * A.biz * B.biz * A.income ** 0.5 * dist ** g.business.e,
      vfr: ic * g.vfr.K * (A.pop * B.pop) ** 0.5 * ties * dist ** g.vfr.e,
    };
  }
  const _qb = {};
  function qBase(o, d) {
    const k = o + d;
    if (_qb[k]) return _qb[k];
    const a = tripGeneration(o, d), b = tripGeneration(d, o);
    return (_qb[k] = { leisure: 0.5 * (a.leisure + b.leisure), business: 0.5 * (a.business + b.business), vfr: 0.5 * (a.vfr + b.vfr) });
  }
  function seasonFactor(o, d, seg, month) {
    if (seg === 'business') return P.SEASON_PROFILES.business[month];
    if (seg === 'vfr') return P.SEASON_PROFILES.vfr[month];
    const end = ap(o).tour > ap(d).tour ? o : d, prof = P.LEISURE_SEASON_PROFILE[end] || 'city';
    const m = ap(end).lat < 0 && prof !== 'winter_sun' ? (month + 6) % 12 : month;
    return P.SEASON_PROFILES[prof][m];
  }
  function qPot(o, d, month = null, dow = null) {
    const base = qBase(o, d), acc = accessibility(o, d), out = {};
    for (const s of P.SEGMENTS) {
      let f = acc;
      if (month !== null) f *= seasonFactor(o, d, s, month);
      if (dow !== null) f *= P.DOW[s][dow];
      out[s] = base[s] * f;
    }
    return out;
  }
  const INDIRECT_ID = '_indirect';
  function offer(airline, fare, freq, seats, service, otp, ramp = 1, key = '', extra = {}) {
    return { airline, key: key || airline, fare, freq, seats, service, otp, ramp, priceOverride: null, penalty: null,
      brand: extra.brand ?? P.BRAND_NEUTRAL, extraU: extra.extraU || null, bizPrem: extra.bizPrem || 0, conn: null, tax: extra.tax ?? null };
  }
  const capacity = (of) => ((of.priceOverride !== null || of.conn) ? Infinity : of.freq * of.seats);
  function indirectOffer(o, d, cpi = 1) {
    const c = P.INDIRECT;
    if (gcDistanceKm(o, d) < c.min_dist_km) return null;
    const long = gcDistanceKm(o, d) >= 4000;
    const of = offer(INDIRECT_ID, 0, long ? 8 : c.freq, 0, c.service, c.otp, 1);
    of.priceOverride = (long ? 0.9 : c.price_vs_ref) * refPrice(o, d, cpi);
    of.penalty = c.penalty;
    return of;
  }
  function withIndirect(o, d, offers, cpi = 1) { const i = indirectOffer(o, d, cpi); return i ? offers.concat([i]) : offers.slice(); }
  function perceivedPrice(o, of, seg) {
    if (of.priceOverride !== null) return of.priceOverride;
    const fare = seg === 'business' ? of.fare * (1 + 0.5 * of.bizPrem) : of.fare;
    return fare + (of.tax ?? ap(o).tax) + P.ANCILLARY_PRICE_WEIGHT * P.SERVICE[of.service].ancillary;
  }
  function utility(o, d, seg, of, cpi = 1) {
    const c = P.CHOICE[seg];
    return c.b_price * Math.log(perceivedPrice(o, of, seg) / refPrice(o, d, cpi))
      + c.b_freq * Math.log(Math.max(of.freq, 1))
      + c.b_service * (P.SERVICE[of.service].svc - 0.5)
      + c.b_otp * (of.otp - 0.80)
      + c.b_brand * ((of.brand ?? P.BRAND_NEUTRAL) - P.BRAND_NEUTRAL)
      + (of.penalty ? of.penalty[seg] : 0)
      + (of.extraU ? of.extraU[seg] || 0 : 0);
  }
  function choiceProbs(o, d, seg, offers, cpi = 1) {
    if (!offers.length) return { probs: [], pOut: 1 };
    const mu = P.NEST_MU;
    const vs = offers.map((of) => utility(o, d, seg, of, cpi) / mu);
    const m = Math.max(...vs);
    const ws = offers.map((of, i) => of.ramp * Math.exp(vs[i] - m));
    const sw = ws.reduce((a, b) => a + b, 0);
    const iv = mu * (m + Math.log(sw));
    const asc = P.CHOICE[seg].asc_out;
    const mm = Math.max(iv, asc);
    const pAir = Math.exp(iv - mm) / (Math.exp(iv - mm) + Math.exp(asc - mm));
    return { probs: ws.map((w) => pAir * w / sw), pOut: 1 - pAir };
  }
  function allocate(o, d, pot, offers, cpi = 1, maxIter = 6) {
    const booked = {}, remCap = {};
    for (const of of offers) { booked[of.key] = { leisure: 0, business: 0, vfr: 0 }; remCap[of.key] = capacity(of); }
    let open = offers.slice(), toAssign = { ...pot }, outside = 0, lost = 0;
    const unconstrained = {};
    for (let it = 0; it < maxIter; it++) {
      const tot = toAssign.leisure + toAssign.business + toAssign.vfr;
      if (!open.length || tot < 1e-9) break;
      const want = {};
      for (const of of open) want[of.key] = {};
      for (const s of P.SEGMENTS) {
        const q = toAssign[s];
        const { probs, pOut } = choiceProbs(o, d, s, open, cpi);
        open.forEach((of, i) => { want[of.key][s] = q * probs[i]; });
        if (it === 0) outside += q * pOut; else lost += q * pOut;
      }
      if (it === 0) for (const k in want) unconstrained[k] = want[k].leisure + want[k].business + want[k].vfr;
      const next = { leisure: 0, business: 0, vfr: 0 }, still = [];
      for (const of of open) {
        const w = want[of.key], t = w.leisure + w.business + w.vfr, cap = remCap[of.key];
        if (t <= cap) { for (const s of P.SEGMENTS) booked[of.key][s] += w[s]; remCap[of.key] -= t; still.push(of); }
        else { const share = t > 0 ? cap / t : 0; for (const s of P.SEGMENTS) { booked[of.key][s] += w[s] * share; next[s] += w[s] * (1 - share); } remCap[of.key] = 0; }
      }
      open = still; toAssign = next;
    }
    lost += toAssign.leisure + toAssign.business + toAssign.vfr;
    return { unconstrained, booked, lost, outside, potential: pot.leisure + pot.business + pot.vfr };
  }
  function eu261(km) { for (const [lim, amt] of P.EU261_COMP) if (km <= lim) return amt; return 600; }
  const COST_KEYS = ['fuel', 'crew', 'maintenance', 'navigation', 'landing', 'handling', 'pax_fees', 'pax_service', 'distribution'];
  function legCosts(o, d, typeId, service, buffer, pax, fareRev, fuelPrice = P.FUEL_USD_KG / P.EURUSD, cpi = 1) {
    const t = P.AIRCRAFT_TYPES[typeId], sv = P.SERVICE[service];
    const bh = blockHours(o, d, typeId), distFlown = gcDistanceKm(o, d) * P.ROUTE_DETOUR;
    const fuelKg = t.fuel_cycle_kg + t.fuel_bh_kg * bh, mt = t.mtow_t;
    const c = {
      fuel: fuelKg * fuelPrice * apx(o).fuel,
      crew: t.crew_bh * sv.crew_factor * bh * cpi * (1 + 0.25 * (pilotsFor(bh) - 2)),
      maintenance: (t.maint_bh * bh + t.maint_cycle) * cpi,
      navigation: (P.NAV_UNIT_RATE * (Math.min(distFlown, 3000) + 0.25 * Math.max(0, distFlown - 3000)) / 100 * Math.sqrt(mt / 50) + P.NAV_TERMINAL_RATE * (mt / 50) ** 0.7) * cpi,
      landing: ap(d).land * mt * cpi,
      handling: t.handling * apx(o).hand * cpi,
      pax_fees: ap(o).paxfee * pax * cpi,
      pax_service: sv.cost_pax * pax * cpi,
      distribution: sv.distribution * fareRev,
      _bh: bh, _fuelKg: fuelKg,
    };
    c.disruption_expected = (1 - t.dispatch_rel) * (pax * (P.CANCEL_CARE_COST_PAX + P.EU261_CLAIM_RATE * eu261(gcDistanceKm(o, d))) + fareRev)
      + P.BUFFER_POLICY[buffer].mean_delay_min * t.delay_cost_min;
    return c;
  }
  const sumCosts = (c) => COST_KEYS.reduce((a, k) => a + (c[k] || 0), 0) + (c.disruption_expected || 0);
  function aircraftDayFixedGeneric(typeId) {
    const t = P.AIRCRAFT_TYPES[typeId];
    return t.value_eur * P.INSURANCE.basic.rate / 365 + P.OVERHEAD_PER_AIRCRAFT_DAY + t.lease_month * 12 / 365;
  }
  function turnHours(typeId, service, buffer, extraMin = 0) {
    return (P.AIRCRAFT_TYPES[typeId].turn_min + P.SERVICE[service].turn_delta + P.BUFFER_POLICY[buffer].extra_turn_min + extraMin) / 60;
  }
  function rotationHours(base, dest, typeId, service, buffer, extraBase = 0, extraDest = 0) {
    return 2 * blockHours(base, dest, typeId) + turnHours(typeId, service, buffer, extraBase) + turnHours(typeId, service, buffer, extraDest);
  }
  const winOf = (typeId) => P.AIRCRAFT_TYPES[typeId].window || P.OPERATING_WINDOW_H;
  /** Anteil Flugzeugtage: Umläufe länger als das Betriebsfenster binden ganze Flugzeuge. */
  const acShareOf = (typeId, h, freq) => { const w = winOf(typeId); return freq * (h > w ? Math.ceil(h / w) : h / w); };
  const pilotsFor = (bhLeg) => (bhLeg > 13 ? 4 : bhLeg > 9 ? 3 : 2);
  const routeKmOk = (o, d) => gcDistanceKm(o, d) >= P.MIN_ROUTE_KM;
  const rangeOk = (o, d, typeId) => gcDistanceKm(o, d) * P.ROUTE_DETOUR <= P.AIRCRAFT_TYPES[typeId].range_km;
  function cargoDemand(o, d, econ = 1) { const A = ap(o), B = ap(d); return P.CARGO.k * Math.sqrt(A.pop * B.pop) * A.biz * B.biz * econ; }
  const cargoYield = (o, d) => P.CARGO.yield * (gcDistanceKm(o, d) / 1000) ** 0.4;

  // ===========================================================================
  // Streckenrechner
  // ===========================================================================
  function marketDraws(o, d, offers, month, nDraws, rng, scale, segScale, cpi) {
    const acc = {};
    for (const of of offers) acc[of.key] = { pax: 0, airline: of.airline, seg: { leisure: 0, business: 0, vfr: 0 }, unc: 0 };
    let lost = 0, outside = 0, pot = 0, n = 0;
    const so = P.DEMAND_NOISE_SIGMA_OD, ss = P.DEMAND_NOISE_SIGMA_SEG;
    for (let dow = 0; dow < 7; dow++) {
      const base = qPot(o, d, month, dow);
      for (let k = 0; k < nDraws; k++) {
        const eps = Math.exp(rng.gauss(0, so) - so * so / 2);
        const p = {};
        for (const s of P.SEGMENTS) p[s] = base[s] * eps * Math.exp(rng.gauss(0, ss) - ss * ss / 2) * scale * (segScale ? segScale[s] : 1);
        const r = allocate(o, d, p, offers, cpi);
        for (const key in r.booked) {
          const b = r.booked[key];
          acc[key].pax += b.leisure + b.business + b.vfr;
          for (const s of P.SEGMENTS) acc[key].seg[s] += b[s];
          acc[key].unc += r.unconstrained[key] || 0;
        }
        lost += r.lost; outside += r.outside; pot += r.potential; n++;
      }
    }
    for (const key in acc) { acc[key].pax /= n; acc[key].unc /= n; for (const s of P.SEGMENTS) acc[key].seg[s] /= n; }
    return { acc, market: { lost: lost / n, outside: outside / n, potential: pot / n } };
  }
  function evaluateRoute(spec, compsOut = [], compsIn = [], opts = {}) {
    const month = opts.month ?? null, nDraws = opts.nDraws ?? 6, fuel = opts.fuelPrice ?? P.FUEL_USD_KG / P.EURUSD, cpi = opts.cpi ?? 1;
    const scale = opts.demandScale ?? 1, rng = new Rng(opts.seed ?? 1);
    const seats = P.AIRCRAFT_TYPES[spec.type_id].seats[spec.service];
    const res = { dirs: {} }, totals = {};
    for (const [dir, o, d, comps, fare] of [['out', spec.base, spec.dest, compsOut, spec.fare_out], ['in', spec.dest, spec.base, compsIn, spec.fare_in]]) {
      const ex = (opts.offerExtra && opts.offerExtra[dir]) || {};
      const own = offer(spec.airline, fare, spec.freq, seats, spec.service, spec.otp ?? P.BUFFER_POLICY[spec.buffer].otp, spec.ramp ?? 1, spec.airline, ex);
      const offers = withIndirect(o, d, [own].concat(comps), cpi);
      const ss = opts.segScale ? opts.segScale[dir] : null;
      const { acc, market } = marketDraws(o, d, offers, month, nDraws, rng, scale, ss, cpi);
      const me = acc[spec.airline];
      const pax = me.pax, perFlight = pax / spec.freq;
      const prem = ex.bizPrem || 0;
      const fareRev = (pax + me.seg.business * prem) * fare * (P.AIRCRAFT_TYPES[spec.type_id].yieldF || 1);
      const c = opts.costFn ? opts.costFn(o, d, perFlight, fareRev / spec.freq, dir) : legCosts(o, d, spec.type_id, spec.service, spec.buffer, perFlight, fareRev / spec.freq, fuel, cpi);
      const costs = {};
      for (const k of COST_KEYS.concat(['disruption_expected'])) { costs[k] = (c[k] || 0) * spec.freq; totals[k] = (totals[k] || 0) + costs[k]; }
      const comp = {};
      for (const key in acc) { if (key === spec.airline || key === INDIRECT_ID) continue; comp[acc[key].airline] = (comp[acc[key].airline] || 0) + acc[key].pax; }
      res.dirs[dir] = { o, d, pax, seg: me.seg, unconstrained: me.unc, seats: spec.freq * seats, lf: pax / (spec.freq * seats),
        fareRev, ancRev: pax * P.SERVICE[spec.service].ancillary * cpi, costs, market, competitors: comp, indirect: acc[INDIRECT_ID] ? acc[INDIRECT_ID].pax : 0, bh: c._bh };
    }
    const O = res.dirs.out, I = res.dirs.in;
    const revenue = O.fareRev + O.ancRev + I.fareRev + I.ancRev;
    const direct = sumObj(totals);
    const rot1 = opts.rotH ?? rotationHours(spec.base, spec.dest, spec.type_id, spec.service, spec.buffer), rotH = rot1 * spec.freq;
    const acShare = acShareOf(spec.type_id, rot1, spec.freq);
    const acFixed = (opts.dayFixed ?? aircraftDayFixedGeneric(spec.type_id)) * acShare + (opts.extraDaily || 0);
    const pax = O.pax + I.pax, seatsTot = O.seats + I.seats, ask = seatsTot * gcDistanceKm(spec.base, spec.dest);
    Object.assign(res, {
      revenue, fareRev: O.fareRev + I.fareRev, ancRev: O.ancRev + I.ancRev, direct, costBreakdown: totals,
      aircraftTimeCost: acFixed, aircraftShare: acShare, rotationH: rotH, db1: revenue - direct, db2: revenue - direct - acFixed,
      pax, seats: seatsTot, lf: pax / seatsTot, raskCt: 100 * revenue / ask, caskCt: 100 * (direct + acFixed) / ask,
      avgFare: pax ? (O.fareRev + I.fareRev) / pax : 0, margin: revenue ? (revenue - direct - acFixed) / revenue : 0,
    });
    return res;
  }

  // ===========================================================================
  // Kalender, Ledger, Route
  // ===========================================================================
  function monthOf(day) { const doy = ((day % 365) + 365) % 365; for (let m = 0; m < 12; m++) if (doy < MONTH_STARTS[m + 1]) return m; return 11; }
  const PNL_ACCOUNTS = ['rev_ticket', 'rev_ancillary', 'rev_cargo', 'rev_acmi', 'fuel', 'hedge', 'crew', 'staff_cockpit', 'staff_cabin', 'staff_tech', 'staff_extra', 'maintenance', 'navigation', 'landing', 'handling',
    'pax_fees', 'pax_service', 'distribution', 'cargo_cost', 'disruption', 'stations', 'slots', 'lease', 'depreciation', 'insurance', 'experts', 'marketing', 'overhead', 'one_off', 'interest', 'tax'];
  const cents = (x) => Math.round(x * 100);
  class Ledger {
    constructor(startCash) { this.pnl = {}; this.cash = cents(startCash); this.equityContrib = cents(startCash); this.month = {}; this.months = []; this.cashHist = []; this.today = {}; }
    post(acc, amount, cash = true) {
      const c = cents(amount);
      if (!c) return;
      this.pnl[acc] = (this.pnl[acc] || 0) + c;
      this.month[acc] = (this.month[acc] || 0) + c;
      this.today[acc] = (this.today[acc] || 0) + c;
      if (cash) this.cash += c;
    }
    cashOnly(amount, label) { const c = cents(amount); if (!c) return; this.cash += c; const k = 'cf_' + label; this.month[k] = (this.month[k] || 0) + c; }
    closeDay() { this.cashHist.push(this.cash / 100); if (this.cashHist.length > 400) this.cashHist.shift(); this.today = {}; }
    closeMonth(label) { this.months.push({ label, acc: this.month }); if (this.months.length > 36) this.months.shift(); this.month = {}; }
    netIncome() { let s = 0; for (const k in this.pnl) s += this.pnl[k]; return s / 100; }
  }
  class Route {
    constructor(o) { Object.assign(this, { pending: [], autoPrice: true, targetLf: 0.85, hist: [], closed: false, reviewNeg: 0, lastChange: -999, closedDay: null, flyingToday: 0 }, o); }
    seats() { return P.AIRCRAFT_TYPES[this.type_id].seats[this.service]; }
    ramp(day, T = P.RAMP_T_DAYS) { const t = Math.max(0, day - this.opened_day); return P.RAMP_R0 + (1 - P.RAMP_R0) * (1 - Math.exp(-t / T)); }
    setFares(day, out, inn) { this.pending.push([day + P.PRICE_CHANGE_LAG_DAYS, out, inn]); }
    applyPending(day) { const keep = []; for (const [d, o, i] of this.pending) { if (d <= day) { this.fare_out = o; this.fare_in = i; } else keep.push([d, o, i]); } this.pending = keep; }
    pushHist(st) { this.hist.push(st); if (this.hist.length > 60) this.hist.shift(); }
  }

  const FIRST = ['Anna', 'Jonas', 'Lea', 'Mehmet', 'Sofia', 'Lukas', 'Marta', 'Pierre', 'Elif', 'Tomás', 'Hannah', 'Niklas', 'Giulia', 'Kofi', 'Ines', 'Jan', 'Clara', 'Malik', 'Freya', 'Diego', 'Katarzyna', 'Felix', 'Amira', 'Oskar', 'Leonie', 'Rui', 'Saskia', 'Matteo', 'Yuki', 'Henrik'];
  const LAST = ['Schneider', 'Kowalski', 'Moreau', 'Yılmaz', 'Hansen', 'Rossi', 'Fischer', 'van Dijk', 'Novak', 'García', 'Becker', 'Oliveira', 'Lindqvist', 'Weber', 'Mensah', 'Dubois', 'Wagner', 'Costa', 'Petersen', 'Huber', 'Schmidt', 'Haddad', 'Brandt', 'Ferreira', 'Keller', 'Nowak', 'Ricci', 'Vogel', 'Lambert', 'Sato'];
  const TRAITS = ['verhandlungsstark', 'zahlenstark', 'gut vernetzt', 'krisenerfahren', 'kommunikativ', 'pragmatisch', 'detailgenau', 'unternehmerisch'];
  const PREV = ['zuvor bei einem Netzwerkcarrier', 'zuvor bei einer Low-Cost-Airline', 'zuvor in der Unternehmensberatung', 'zuvor bei einem Flughafenbetreiber', 'zuvor bei einem Leasinggeber', 'zuvor bei einer Ferienfluggesellschaft', 'Quereinstieg aus dem Handel', 'zuvor bei einem Reiseveranstalter'];
  const STAFF_GROUPS = Object.keys(P.TYPE_GROUPS);
  const zeroGroups = () => Object.fromEntries(STAFF_GROUPS.map((g) => [g, 0]));
  function roleLabel(role, group) { if (role === 'pilot') return `Piloten (${P.TYPE_GROUPS[group]})`; if (role === 'cabin') return 'Flugbegleiter'; return 'Techniker'; }

  // ===========================================================================
  // Airline
  // ===========================================================================
  class Airline {
    constructor(id, name, base, archetype = null, equity = P.START_EQUITY_EUR, maxFleet = 99, color = null) {
      Object.assign(this, { id, name, archetype, color, bases: [base], fleet: [], routes: [], typesIntroduced: [], creditUsed: 0,
        lossCarry: 0, monthPnlStart: 0, distressDays: 0, status: 'active', events: [], otpHist: [], maxFleet, warnLevel: null,
        acCounter: 0, routeCounter: 0, sigma: null, brand: archetype ? P.AI_ARCHETYPES[archetype].brand : 0.40, marketing: 0,
        cargo: archetype ? P.AI_ARCHETYPES[archetype].cargo : false, loans: [], rating: 'BB', insurance: 'basic',
        hedge: null, experts: [], studies: {}, stations: {}, hangars: [], decisions: [], milestones: {},
        staff: archetype ? null : { pil: zeroGroups(), cab: 0, tech: 0, pipeline: [], pay: 1.0, morale: 0.65, agency: true, cov: null } });
      this.ledger = new Ledger(equity);
      this.rngForecast = new Rng(hashStr(id));
    }
    get isPlayer() { return !this.archetype; }
    get cfg() {
      if (!this.archetype) return null;
      const c = P.AI_ARCHETYPES[this.archetype];
      const o = this.sigma ? { ...c, forecast_sigma: this.sigma } : { ...c };
      if (this.prefTypes) o.pref_types = this.prefTypes;
      return o;
    }
    skill(role) { let lv = 0; for (const e of this.experts) if (e.role === role) lv = Math.max(lv, e.level); return lv; }
    stage() { const n = this.fleet.length; let s = P.STAGES[0]; for (const st of P.STAGES) if (n >= st.min) s = st; return s; }
    otp(buffer) {
      const base = P.BUFFER_POLICY[buffer].otp + lv3([0, 0.03, 0.05, 0.08], this.skill('ops'));
      if (this.otpHist.length < 10) return base;
      return this.otpHist.reduce((a, b) => a + b, 0) / this.otpHist.length;
    }
    pushOtp(v) { this.otpHist.push(v); if (this.otpHist.length > 60) this.otpHist.shift(); }
    activeRoutes() { return this.routes.filter((r) => !r.closed); }
    log(day, msg, kind = 'info') { this.events.push({ day, msg, kind }); if (this.events.length > 300) this.events.shift(); }
    station(apt) { if (!this.stations[apt]) this.stations[apt] = { handling: 'contract', terminal: 'std' }; return this.stations[apt]; }
    terminalAt(apt) { return this.isPlayer && this.stations[apt] ? this.stations[apt].terminal : 'std'; }
    turnExtra(apt) { return P.TERMINALS[this.terminalAt(apt)].turn; }
    rotH(r) { return rotationHours(r.base, r.dest, r.type_id, r.service, r.buffer, this.turnExtra(r.base), this.turnExtra(r.dest)); }
    extraU(o, d) {
      if (!this.isPlayer) return null;
      const a = P.TERMINALS[this.terminalAt(o)].u, b = P.TERMINALS[this.terminalAt(d)].u;
      return { leisure: (a.leisure + b.leisure) / 2, business: (a.business + b.business) / 2, vfr: (a.vfr + b.vfr) / 2 };
    }
    bizPrem() { return lv3([0, 0.08, 0.15, 0.22], this.skill('revenue')); }
    rampT() { return lv3([30, 24, 20, 16], this.skill('marketing')); }
    ratingInfo() { return P.RATINGS.find((x) => x.r === this.rating) || P.RATINGS[2]; }
    creditLimit() {
      const owned = this.fleet.filter((a) => a.owned).reduce((s, a) => s + a.nbv, 0);
      const f = this.isPlayer ? this.ratingInfo().line * lv3([1, 1.25, 1.5, 2], this.skill('finance')) : 1;
      return P.CREDIT_LINE_BASE * f + P.CREDIT_LINE_ASSET_SHARE * owned;
    }
    creditRate(baseRate) { return baseRate + (this.isPlayer ? this.ratingInfo().spread - lv3([0, 0.005, 0.01, 0.015], this.skill('finance')) : 0.025) + 0.02; }

    newAircraft(typeId, base, o = {}) {
      this.acCounter++;
      return Object.assign({ id: `${this.id}-${String(this.acCounter).padStart(3, '0')}`, type_id: typeId, base, owned: false, flex: false,
        delivery_day: 0, lease_start: 0, nbv: 0, loan: 0, loanRate: 0, used_hours: 0, idle_days: 0, deposit: 0, age0: P.AIRCRAFT_TYPES[typeId].age,
        bornDay: 0, fh: 0, lastC: 0, status: 'ok', until: null, leaseUsd: P.AIRCRAFT_TYPES[typeId].lease_month * P.EURUSD, leaseMonth: P.AIRCRAFT_TYPES[typeId].lease_month, acmi: null, assigned: [] }, o);
    }
    acquire(day, typeId, base, mode = 'lease', offerData = null, world = null) {
      const t = P.AIRCRAFT_TYPES[typeId], L = this.ledger;
      const age = mode === 'factory' ? 0 : offerData ? offerData.age : t.age;
      const ac = this.newAircraft(typeId, base, { age0: age, bornDay: day, fh: offerData ? offerData.fhSinceC || 0 : Math.floor(age * 1700) % P.CCHECK_FH, lastC: 0 });
      if (!this.familyKnown(typeId)) L.post('one_off', -P.TYPE_INTRO_COST);
      if (!this.typesIntroduced.includes(typeId)) this.typesIntroduced.push(typeId);
      const eurusd = world ? world.macro.eurusd : P.EURUSD;
      if (mode === 'buy' || mode === 'factory') {
        const price = offerData ? offerData.price : t.value_eur * (mode === 'factory' ? 1.08 : 1);
        ac.owned = true; ac.delivery_day = day + (mode === 'factory' ? P.FACTORY_DELIVERY_DAYS : (offerData ? offerData.delivery : P.PURCHASE_DELIVERY_DAYS));
        ac.nbv = price; ac.value0 = price; ac.loan = price * (1 - P.PURCHASE_DOWNPAYMENT);
        ac.loanRate = world ? world.macro.rate + 0.025 : 0.06;
        L.cashOnly(-price, 'capex'); L.cashOnly(ac.loan, 'loan_draw');
      } else {
        ac.flex = mode === 'flex';
        ac.delivery_day = day + (offerData ? offerData.delivery : P.LEASE_DELIVERY_DAYS);
        ac.lease_start = ac.delivery_day;
        ac.leaseUsd = (offerData ? offerData.lease_month : t.lease_month) * P.EURUSD;
        ac.leaseMonth = ac.leaseUsd / eurusd;
        if (!ac.flex) { ac.deposit = P.LEASE_DEPOSIT_MONTHS * ac.leaseMonth; L.cashOnly(-ac.deposit, 'deposit'); }
      }
      this.fleet.push(ac);
      const modeTxt = { buy: 'gekauft', factory: 'fabrikneu bestellt', flex: 'per Flex-Leasing übernommen', lease: 'geleast' }[mode];
      this.log(day, `${P.AIRCRAFT_TYPES[typeId].label} ${modeTxt}${age >= 1 ? ` (${Math.round(age)} Jahre alt)` : ''}, Lieferung in ${ac.delivery_day - day} Tagen`, 'fleet');
      return ac;
    }
    familyKnown(typeId) { const g = P.AIRCRAFT_TYPES[typeId].group; return this.typesIntroduced.some((x) => P.AIRCRAFT_TYPES[x] && P.AIRCRAFT_TYPES[x].group === g); }
    acAge(ac, day) { return ac.age0 + Math.max(0, day - ac.bornDay) / 365; }
    disposeCost(day, ac) {
      if (ac.owned) return { pnl: ac.nbv * 0.92 - ac.nbv, cash: ac.nbv * 0.92 - ac.loan };
      if (ac.flex) return { pnl: 0, cash: 0 };
      const monthsUsed = (day - ac.lease_start) / 30.4;
      const pen = (monthsUsed < P.LEASE_MIN_TERM_MONTHS ? P.LEASE_EARLY_RETURN_MONTHS * ac.leaseMonth : 0) + (ac.delivery_day <= day ? P.LEASE_RETURN_COST : 0);
      return { pnl: -pen, cash: ac.deposit - pen };
    }
    dispose(day, ac, reason = '') {
      const L = this.ledger;
      if (ac.owned) {
        const sale = Math.round(ac.nbv * 0.92 * 100) / 100;
        L.post('one_off', sale - ac.nbv, false); L.cashOnly(sale, 'asset_sale'); L.cashOnly(-ac.loan, 'loan_repay');
      } else if (!ac.flex) {
        const c = this.disposeCost(day, ac);
        L.post('one_off', c.pnl); L.cashOnly(ac.deposit, 'deposit_back');
      }
      this.fleet = this.fleet.filter((a) => a !== ac);
      this.log(day, `${P.AIRCRAFT_TYPES[ac.type_id].label} ${ac.id} abgegeben${reason ? ' (' + reason + ')' : ''}`, 'fleet');
    }
    available(ac, day, horizon = 0) {
      if (ac.delivery_day > day + horizon) return false;
      if (ac.acmi && ac.acmi.start <= day && ac.acmi.end > day) return false;
      if ((ac.status === 'ccheck' || ac.status === 'aog') && ac.until > day && horizon === 0) return false;
      return true;
    }
    openRoute(day, base, dest, typeId, freq, fareOut, fareIn, service, buffer, targetLf = 0.85, autoPrice = true, logIt = true) {
      this.routeCounter++;
      const r = new Route({ id: `${this.id}-R${this.routeCounter}`, airline: this.id, base, dest, type_id: typeId, freq, fare_out: fareOut,
        fare_in: fareIn, service, buffer, opened_day: day, targetLf, autoPrice });
      this.routes.push(r);
      if (this.isPlayer) { this.station(base); this.station(dest); }
      if (logIt) this.log(day, `Strecke ${base}–${dest} eröffnet: ${freq}x täglich, ${P.AIRCRAFT_TYPES[typeId].label}, ${Math.round(fareOut)}/${Math.round(fareIn)} EUR`, 'route');
      return r;
    }
    closeRoute(day, r, why) { r.closed = true; r.closedDay = day; this.log(day, `Strecke ${r.base}–${r.dest} geschlossen (${why})`, 'route'); }
    plan(day, routes = null, horizon = 0) {
      routes = routes || this.activeRoutes();
      const assign = {}, used = {};
      for (const a of this.fleet) { assign[a.id] = []; used[a.id] = 0; }
      let ok = true;
      const rots = [];
      for (const r of routes) { const h = this.rotH(r); for (let i = 0; i < r.freq; i++) rots.push([h, r]); }
      rots.sort((a, b) => b[0] - a[0]);
      const unplaced = {};
      for (const [h, r] of rots) {
        let placed = false;
        const w = winOf(r.type_id);
        if (h > w) {
          const k = Math.ceil(h / w), free = this.fleet.filter((a) => a.type_id === r.type_id && a.base === r.base && this.available(a, day, horizon) && used[a.id] === 0);
          if (free.length >= k) { for (const a of free.slice(0, k)) { used[a.id] = w; assign[a.id].push([r, h / k]); } placed = true; }
        } else {
          for (const a of this.fleet) {
            if (a.type_id === r.type_id && a.base === r.base && this.available(a, day, horizon) && used[a.id] + h <= w + 1e-9) {
              used[a.id] += h; assign[a.id].push([r, h]); placed = true; break;
            }
          }
        }
        if (!placed) { ok = false; unplaced[r.id] = (unplaced[r.id] || 0) + 1; }
      }
      return { ok, assign, used, unplaced };
    }
    spareCapacity(day, typeId, base, hours) {
      const { used } = this.plan(day, null, P.LEASE_DELIVERY_DAYS), w = winOf(typeId);
      const cands = this.fleet.filter((a) => a.type_id === typeId && a.base === base && this.available(a, day, P.LEASE_DELIVERY_DAYS));
      if (hours > w) return cands.filter((a) => (used[a.id] || 0) === 0).length >= Math.ceil(hours / w);
      return cands.some((a) => (used[a.id] || 0) + hours <= w);
    }
    staffHourly(role, group) {
      const S = P.STAFF, pay = this.staff ? this.staff.pay : 1;
      if (role === 'pilot') return S.pilotSalary[group] * pay / (30.4 * S.pilotH);
      if (role === 'cabin') return S.cabinSalary * pay / (30.4 * S.cabinH);
      return S.techSalary * pay / 30.4;
    }
    staffMonthly(cpi = 1) {
      if (!this.staff) return 0;
      const S = P.STAFF, st = this.staff;
      let s = st.cab * S.cabinSalary + st.tech * S.techSalary;
      for (const g of STAFF_GROUPS) s += st.pil[g] * S.pilotSalary[g];
      return s * st.pay * cpi;
    }
    staffNeedPlanned() {
      // Bedarf an Köpfen für den aktuellen Flugplan (ohne Reserve)
      const need = { pil: zeroGroups(), cab: 0, tech: 0 };
      for (const r of this.activeRoutes()) {
        const t = P.AIRCRAFT_TYPES[r.type_id], leg = blockHours(r.base, r.dest, r.type_id), bh = leg * 2 * r.freq;
        need.pil[t.group] += pilotsFor(leg) * bh / P.STAFF.pilotH; need.cab += t.cabin * bh / P.STAFF.cabinH;
      }
      need.tech = this.fleet.length * P.STAFF.techPerAc;
      return need;
    }
  }

  // ===========================================================================
  // Strecken-Helfer
  // ===========================================================================
  function routeDb(r, days, al) {
    const h = r.hist.slice(-days);
    if (!h.length) return 0;
    let rev = 0, cost = 0;
    for (const x of h) { rev += x.rev; cost += x.cost; }
    const rot = (al ? al.rotH(r) : rotationHours(r.base, r.dest, r.type_id, r.service, r.buffer)) * r.freq;
    return rev - cost - aircraftDayFixedGeneric(r.type_id) * acShareOf(r.type_id, rot / r.freq, r.freq) * h.length;
  }
  function routeLf(r, days, dir = null) {
    const h = r.hist.slice(-days);
    let s = 0, p = 0;
    for (const x of h) { if (dir) { s += x['seats_' + dir]; p += x['pax_' + dir]; } else { s += x.seats; p += x.pax; } }
    return s ? p / s : 0;
  }
  function priceFloor(o, d, r, w) {
    const seats = r.seats();
    const c = legCosts(o, d, r.type_id, r.service, r.buffer, seats * r.targetLf, 0, w ? w.fuelPrice : undefined, w ? w.macro.cpi : 1);
    return 0.85 * sumCosts(c) / (seats * r.targetLf);
  }
  function aiRulePrice(o, d, cfg, comps, cpi = 1) {
    let p = cfg.price_vs_ref * refPrice(o, d, cpi);
    if (comps.length && cfg.undercut > 0) p = Math.min(p, Math.min(...comps) * (1 - cfg.undercut));
    return p;
  }
  function destFits(arch, base, dest) {
    const a = ap(dest), dist = gcDistanceKm(base, dest);
    if (dist < P.MIN_ROUTE_KM) return false;
    if (arch === 'leisure') return a.tour >= 1.5;
    if (arch === 'regional') return dist <= 1300;
    if (arch === 'premium') return a.biz >= 1.0;
    return dist >= 400 && dist <= 5500;
  }

  // ===========================================================================
  // Ereignisse
  // ===========================================================================
  const EVENT_TYPES = {
    fuel_spike: { p: 0.05 }, fuel_drop: { p: 0.035 }, recession: { p: 0.025 }, boom: { p: 0.025 }, atc_strike: { p: 0.05 },
    airport_strike: { p: 0.04 }, volcano: { p: 0.003 }, big_event: { p: 0.07 }, tax_change: { p: 0.02 }, rate_change: { p: 0.07 },
    health: { p: 0.0025 }, pilot_shortage: { p: 0.025 }, fx_shock: { p: 0.03 },
  };
  const BIG_EVENTS = { FRA: 'Internationale Fachmesse', MUC: 'Oktoberfest', LHR: 'Tennisturnier', CDG: 'Modewoche', BCN: 'Mobilfunkkongress', AMS: 'Musikfestival', BER: 'Filmfestspiele', FCO: 'Kirchliches Jubiläum', LIS: 'Technologiekonferenz', VIE: 'Opernball', HAM: 'Hafengeburtstag', DUS: 'Bootsmesse', PMI: 'Segelregatta' };

  // ===========================================================================
  // Welt
  // ===========================================================================
  class World {
    constructor(seed = 1) {
      this.rng = new Rng(seed);
      this.day = 0; this.airlines = {}; this.order = [];
      this.macro = { fuelUsd: P.FUEL_USD_KG, fuelRefUsd: P.FUEL_USD_KG, eurusd: P.EURUSD, rate: P.BASE_RATE, cpi: 1,
        econ: Object.fromEntries(COUNTRIES.map((c) => [c, 1])), econTarget: Object.fromEntries(COUNTRIES.map((c) => [c, 1])),
        taxDelta: Object.fromEntries(COUNTRIES.map((c) => [c, 0])), laborTight: 1 };
      this.playerId = null; this.news = []; this.fuelHist = []; this.events = []; this.eventCounter = 0;
      this.seed = seed >>> 0; this._trend = {}; this._trendDay = -1;
      this.slotCap = {}; this.candidates = []; this.acMarket = []; this.acmiOffers = []; this.offerCounter = 0; this.eventMult = 1;
    }
    get fuelPrice() { return this.macro.fuelUsd / this.macro.eurusd; }
    add(al) { this.airlines[al.id] = al; this.order.push(al.id); return al; }
    get list() { return this.order.map((k) => this.airlines[k]); }
    get player() { return this.playerId ? this.airlines[this.playerId] : null; }
    get humans() { return this.list.filter((al) => al.isPlayer); }
    pushNews(day, msg, kind, airline) { this.news.push({ day, msg, kind, airline }); if (this.news.length > 250) this.news.shift(); }

    econFactor(o, d, seg) { const e = Math.sqrt(this.macro.econ[ap(o).country] * this.macro.econ[ap(d).country]); return e ** P.CHOICE[seg].econ; }
    segScale(o, d, extra = 1) { return Object.fromEntries(P.SEGMENTS.map((s) => [s, this.econFactor(o, d, s) * extra])); }
    activeEvents(day = this.day) { return this.events.filter((e) => e.start <= day && e.end + (e.recovery || 0) > day && e.scope !== 'airline'); }
    upcomingEvents(day = this.day) { return this.events.filter((e) => e.start > day && e.scope !== 'airline'); }
    eventAffects(e, apt) { return e.scope === 'all' || (e.airports && e.airports.includes(apt)) || (e.countries && e.countries.includes(ap(apt).country)); }
    demandMult(o, d, seg, day = this.day) {
      let m = 1;
      for (const e of this.events) {
        if (!e.demand || e.start > day || e.end + (e.recovery || 0) <= day) continue;
        let f = e.demand[seg] ?? 1;
        if (e.recovery && day >= e.end) f = 1 + (f - 1) * (1 - (day - e.end) / e.recovery);
        if (e.scope === 'all') m *= f;
        else if (e.airports && (e.airports.includes(d) || e.airports.includes(o))) m *= f;
      }
      return m;
    }
    opsAt(apt, day = this.day) {
      let cancel = 0, delay = 0;
      for (const e of this.events) {
        if (e.start > day || e.end <= day || !e.ops) continue;
        if (this.eventAffects(e, apt)) { cancel = 1 - (1 - cancel) * (1 - (e.ops.cancel || 0)); delay += e.ops.delay || 0; }
      }
      return { cancel, delay };
    }
    taxAt(apt, dest = null) { const long = dest && gcDistanceKm(apt, dest) > P.LONGHAUL_TAX_KM; return Math.max(0, (long ? COUNTRY_DATA[ap(apt).country].taxLong : ap(apt).tax) + this.macro.taxDelta[ap(apt).country]); }
    /** Verborgener Markttrend je Strecke: fester Grundwert plus langsame Schwankung, aus dem Weltseed abgeleitet (kein Speicherbedarf). */
    trendOf(o, d) {
      const k = pairKey(o, d), m = Math.floor(this.day / 30);
      if (this._trendDay !== m) { this._trend = {}; this._trendDay = m; }
      if (this._trend[k] !== undefined) return this._trend[k];
      const g = new Rng(hashStr(this.seed + ':' + k)), base = g.gauss(0, P.TREND_SIGMA), amp = g.range(0.03, 0.08), per = g.range(700, 1500), ph = g.range(0, 6.283);
      return (this._trend[k] = Math.exp(base + amp * Math.sin(ph + 6.283 * m * 30 / per)));
    }
    addEvent(ev, lead = 0) {
      this.eventCounter++;
      const e = Object.assign({ id: 'E' + this.eventCounter, announced: this.day, start: this.day + lead }, ev);
      this.events.push(e);
      this.pushNews(this.day, (lead > 0 ? 'Angekündigt: ' : '') + e.text, e.severity || 'event', null);
      if (e.severity !== 'good') for (const h of this.humans) h.log(this.day, e.text, e.severity === 'crit' ? 'crit' : 'warn');
      return e;
    }
    generateMonthlyEvents() {
      const r = this.rng, M = this.macro, mult = this.eventMult, day = this.day;
      const roll = (k) => r.random() < EVENT_TYPES[k].p * mult;
      if (roll('fuel_spike')) { const f = r.range(1.2, 1.55); M.fuelUsd *= f; this.addEvent({ type: 'fuel_spike', scope: 'all', end: day + 90, text: `Ölpreisschock: Kerosin steigt um ${Math.round((f - 1) * 100)} %. Der Preis normalisiert sich über mehrere Monate.`, severity: 'crit' }); }
      else if (roll('fuel_drop')) { const f = r.range(0.75, 0.88); M.fuelUsd *= f; this.addEvent({ type: 'fuel_drop', scope: 'all', end: day + 60, text: `Ölpreis fällt: Kerosin ${Math.round((1 - f) * 100)} % günstiger.`, severity: 'good' }); }
      if (roll('recession')) {
        const cs = [...new Set(r.random() < 0.25 ? COUNTRIES : [r.pick(COUNTRIES), r.pick(COUNTRIES)])];
        const depth = r.range(0.06, 0.13);
        this.addEvent({ type: 'recession', countries: cs, depth, end: day + 30 + r.int(180, 300), text: `Frühindikatoren brechen ein: Rezession in ${cs.length === COUNTRIES.length ? 'der Weltwirtschaft' : cs.map((c) => COUNTRY_NAMES[c]).join(' und ')} erwartet. Geschäftsreisen leiden am stärksten.`, severity: 'warn' }, 30);
      } else if (roll('boom')) {
        const c = r.pick(COUNTRIES);
        M.econTarget[c] = Math.max(M.econTarget[c], 1 + r.range(0.04, 0.09));
        this.addEvent({ type: 'boom', countries: [c], end: day + 240, text: `Aufschwung in ${COUNTRY_NAMES[c]}: mehr Geschäftsreisen und Urlaubsbuchungen.`, severity: 'good' });
      }
      if (roll('atc_strike')) {
        const c = r.random() < 0.45 ? 'FR' : r.random() < 0.5 ? 'IT' : r.pick(COUNTRIES);
        const lead = r.int(3, 6), dur = r.int(1, 2);
        this.addEvent({ type: 'atc_strike', countries: [c], end: day + lead + dur, ops: { cancel: 0.6, delay: 40 }, text: `Fluglotsenstreik in ${COUNTRY_NAMES[c]}: ${dur} Tag${dur > 1 ? 'e' : ''}, rund 60 % der Flüge fallen aus.`, severity: 'warn' }, lead);
      }
      if (roll('airport_strike')) {
        const a = r.pick(AP_CODES), lead = r.int(2, 4);
        this.addEvent({ type: 'airport_strike', airports: [a], end: day + lead + 1, ops: { cancel: 0.8, delay: 30 }, text: `Warnstreik des Bodenpersonals in ${ap(a).name}: ein Tag mit massiven Ausfällen.`, severity: 'warn' }, lead);
      }
      if (day > 180 && roll('volcano')) {
        const aps = ['HAM', 'BER', 'AMS', 'LHR', 'DUS', 'FRA'], dur = r.int(3, 6);
        this.addEvent({ type: 'volcano', airports: aps, end: day + dur, ops: { cancel: 1.0, delay: 0 }, text: `Vulkanasche über Nordeuropa: Luftraum über ${aps.map((x) => ap(x).name).join(', ')} für ${dur} Tage gesperrt.`, severity: 'crit' });
      }
      if (roll('big_event')) {
        const a = r.pick(AP_CODES), lead = r.int(20, 40), dur = r.int(4, 9);
        this.addEvent({ type: 'big_event', airports: [a], end: day + lead + dur, demand: { leisure: 1.35, business: 1.2, vfr: 1.1 }, text: `${BIG_EVENTS[a] || 'Großveranstaltung'} in ${ap(a).name}: ${dur} Tage deutlich mehr Nachfrage.`, severity: 'good' }, lead);
      }
      if (roll('tax_change')) {
        const c = r.pick(COUNTRIES), delta = r.random() < 0.6 ? r.int(3, 10) : -r.int(3, 8), lead = 60;
        this.addEvent({ type: 'tax_change', countries: [c], end: day + lead + 1, taxDelta: delta, text: `Ticketsteuer in ${COUNTRY_NAMES[c]}: In ${lead} Tagen ${delta > 0 ? 'steigt' : 'sinkt'} sie um ${Math.abs(delta)} EUR je Abflug.`, severity: delta > 0 ? 'warn' : 'good' }, lead);
      }
      if (roll('rate_change')) {
        const dd = (r.random() < 0.5 ? 1 : -1) * (r.random() < 0.7 ? 0.0025 : 0.005);
        if (M.rate + dd >= 0 && M.rate + dd <= 0.07) { M.rate += dd; this.addEvent({ type: 'rate_change', scope: 'all', end: day + 1, text: `Die Zentralbank ${dd > 0 ? 'erhöht' : 'senkt'} den Leitzins auf ${(M.rate * 100).toFixed(2).replace('.', ',')} %. Kreditlinie und neue Kredite passen sich an.`, severity: dd > 0 ? 'warn' : 'good' }); }
      }
      if (day > 270 && roll('health')) {
        this.addEvent({ type: 'health', scope: 'all', end: day + 7 + 60, recovery: 120, demand: { leisure: 0.6, business: 0.55, vfr: 0.75 }, text: 'Gesundheitskrise: weltweite Reisewarnungen. Die Nachfrage bricht für Monate ein und erholt sich langsam.', severity: 'crit' }, 7);
      }
      if (roll('pilot_shortage')) { M.laborTight = 2; this.addEvent({ type: 'pilot_shortage', scope: 'all', end: day + 180, text: 'Weltweiter Pilotenmangel: Neueinstellungen dauern doppelt so lange und kosten mehr.', severity: 'warn' }); }
      if (roll('fx_shock')) {
        const f = r.random() < 0.5 ? r.range(0.92, 0.96) : r.range(1.04, 1.08);
        M.eurusd *= f;
        this.addEvent({ type: 'fx_shock', scope: 'all', end: day + 1, text: `Der Euro ${f < 1 ? 'fällt' : 'steigt'} deutlich: 1 EUR = ${M.eurusd.toFixed(3).replace('.', ',')} USD. Leasingraten und Kerosin werden in Dollar bezahlt.`, severity: f < 1 ? 'warn' : 'good' });
      }
    }
    dailyEvents() {
      const r = this.rng, m = monthOf(this.day), winter = [9, 10, 11, 0, 1, 2].includes(m);
      if (r.random() < (winter ? 0.010 : 0.004) * this.eventMult) {
        const center = r.pick(AP_CODES);
        const aps = AP_CODES.filter((c) => gcDistanceKm(c, center) < 450);
        const lat = ap(center).lat, tropic = Math.abs(lat) < 26, south = lat < 0;
        const isWinter = south ? [4, 5, 6, 7, 8].includes(m) : winter;
        const kind = tropic ? ([5, 6, 7, 8, 9, 10].includes(m) && !south ? (ap(center).lon < -30 ? 'Hurrikan' : 'Taifun') : 'Tropengewitter') : isWinter ? (r.random() < 0.5 ? 'Schneesturm' : 'Sturmtief') : 'Gewitterfront';
        const dur = r.int(1, 2);
        this.addEvent({ type: 'storm', airports: aps, end: this.day + dur, ops: { cancel: winter ? 0.25 : 0.12, delay: 45 }, text: `${kind} über ${aps.map((x) => ap(x).name).join(', ')}: Ausfälle und Verspätungen für ${dur} Tag${dur > 1 ? 'e' : ''}.`, severity: 'warn' });
      }
      for (const e of this.events) {
        if (e.applied || e.start > this.day) continue;
        if (e.taxDelta) for (const c of e.countries) this.macro.taxDelta[c] += e.taxDelta;
        if (e.type === 'recession') for (const c of e.countries) this.macro.econTarget[c] = Math.min(this.macro.econTarget[c], 1 - e.depth);
        e.applied = true;
      }
      for (const e of this.events) if (e.type === 'recession' && e.applied && e.end === this.day) for (const c of e.countries) this.macro.econTarget[c] = 1;
      if (this.events.length > 120) this.events = this.events.filter((e) => e.end + (e.recovery || 0) > this.day - 60);
    }
    monthlyMacro() {
      const M = this.macro, r = this.rng;
      for (const c of COUNTRIES) M.econ[c] = M.econ[c] + 0.3 * (M.econTarget[c] - M.econ[c]) + r.gauss(0, 0.006);
      for (const c of COUNTRIES) if (!this.events.some((e) => e.type === 'recession' && e.applied && e.end > this.day && e.countries.includes(c))) M.econTarget[c] = 1 + (M.econTarget[c] - 1) * 0.9;
      M.fuelUsd *= Math.exp(r.gauss(0, 0.04) + 0.15 * Math.log(M.fuelRefUsd / M.fuelUsd));
      M.eurusd *= Math.exp(r.gauss(0, 0.012) + 0.05 * Math.log(P.EURUSD / M.eurusd));
      M.cpi *= 1 + 0.022 / 12;
      M.laborTight = 1 + (M.laborTight - 1) * 0.85;
    }

    // Slots
    slotUse(apt) {
      let n = 0;
      for (const al of this.list) { if (al.status === 'insolvent') continue; for (const r of al.activeRoutes()) if (r.base === apt || r.dest === apt) n += r.freq; }
      return n;
    }
    slotsFree(apt) { if (apx(apt).slots === null) return Infinity; return (this.slotCap[apt] ?? 0) - this.slotUse(apt); }
    slotsOk(o, d, extra) { return this.slotsFree(o) >= extra && this.slotsFree(d) >= extra; }
    initSlots() { for (const c of AP_CODES) if (apx(c).slots !== null) this.slotCap[c] = this.slotUse(c) + apx(c).slots; }

    // Kosten je Flug
    fuelAvg() { const h = this.fuelHist.slice(-365); return h.length ? h.reduce((a, b) => a + b, 0) / h.length : this.fuelPrice; }
    fuelPriceFor(al, o) {
      const spot = this.fuelPrice * apx(o).fuel;
      if (!al.isPlayer) return 0.5 * spot + 0.5 * this.fuelAvg() * apx(o).fuel;
      const disc = 1 - lv3([0, 0.02, 0.04, 0.06], al.skill('procurement'));
      const h = al.hedge && al.hedge.until > this.day ? al.hedge : null;
      return (h ? h.share * h.price * apx(o).fuel + (1 - h.share) * spot : spot) * disc;
    }
    ageOf(al, r) {
      const acs = al.fleet.filter((a) => a.assigned && a.assigned.includes(r.id));
      if (!acs.length) return P.AIRCRAFT_TYPES[r.type_id].age;
      return acs.reduce((s, a) => s + al.acAge(a, this.day), 0) / acs.length;
    }
    costsFor(al, r, o, d, pax, fareRev, forecast = false) {
      const t = P.AIRCRAFT_TYPES[r.type_id], cpi = this.macro.cpi;
      const c = legCosts(o, d, r.type_id, r.service, r.buffer, pax, fareRev, this.fuelPrice, cpi);
      const age = forecast ? (r.age ?? t.age) : this.ageOf(al, r);
      c.fuel = c._fuelKg * this.fuelPriceFor(al, o) * (1 + P.AGE.fuel * age);
      let maintF = 1 + P.AGE.maint * age;
      if (al.isPlayer) {
        const proc = 1 - lv3([0, 0.03, 0.06, 0.09], al.skill('procurement'));
        const crewN = pilotsFor(c._bh) + t.cabin;
        const perDiem = crewN * P.STAFF.perDiem * c._bh * cpi;
        c.crew = forecast ? (pilotsFor(c._bh) * al.staffHourly('pilot', t.group) + t.cabin * al.staffHourly('cabin')) * c._bh * cpi + perDiem : perDiem;
        const cov = al.staff && al.staff.cov ? al.staff.cov.tech : 1;
        maintF *= (1 - P.STAFF.techMaintShare * Math.min(1, cov)) * (1 + 0.15 * Math.max(0, 1 - cov));
        maintF *= 1 - lv3([0, 0.03, 0.05, 0.08], al.skill('tech'));
        if (al.hangars.includes(r.base)) maintF *= P.HANGAR_MAINT;
        const st = al.stations[o];
        c.handling = st && st.handling === 'own' ? t.handling * P.OWN_HANDLING_SHARE * cpi : t.handling * apx(o).hand * cpi * proc;
        c.pax_fees = ap(o).paxfee * P.TERMINALS[al.terminalAt(o)].paxF * pax * cpi;
      }
      c.maintenance *= maintF;
      return c;
    }
    /** Prognose für den Spieler mit seiner Kostenstruktur (Personal als Stundensatz, Stationen, Marke, Studien). */
    forecastFor(al, spec, opts = {}) {
      const co = this.competitorOffers(al.id, spec.base, spec.dest), ci = this.competitorOffers(al.id, spec.dest, spec.base);
      const trend = this.knownTrend(al, spec.base, spec.dest);
      const r = { ...spec, age: opts.age };
      const rotH = rotationHours(spec.base, spec.dest, spec.type_id, spec.service, spec.buffer, al.turnExtra(spec.base), al.turnExtra(spec.dest));
      const t = P.AIRCRAFT_TYPES[spec.type_id];
      const dayFixed = t.value_eur * P.INSURANCE[al.insurance].rate / 365 + P.OVERHEAD_PER_AIRCRAFT_DAY * this.macro.cpi + t.lease_month * (P.EURUSD / this.macro.eurusd) * 12 / 365
        + P.STAFF.techPerAc * P.STAFF.techSalary * (al.staff ? al.staff.pay : 1) * this.macro.cpi / 30.4;
      let slotFee = 0; for (const x of [spec.base, spec.dest]) slotFee += apx(x).slotFee * spec.freq * this.macro.cpi;
      return evaluateRoute(spec, co, ci, {
        month: opts.month ?? null, nDraws: opts.nDraws ?? 4, seed: opts.seed ?? 7, fuelPrice: this.fuelPrice, cpi: this.macro.cpi,
        demandScale: (opts.demandScale ?? 1) * trend, segScale: { out: this.segScale(spec.base, spec.dest), in: this.segScale(spec.dest, spec.base) },
        offerExtra: { out: { ...this.offerExtra(al, spec.base, spec.dest), }, in: { ...this.offerExtra(al, spec.dest, spec.base) } },
        costFn: (o, d, pax, fareRev) => this.costsFor(al, { ...r, base: spec.base, dest: spec.dest }, o, d, pax, fareRev, true),
        rotH, dayFixed, extraDaily: slotFee + (opts.extraDaily || 0),
      });
    }

    // Angebot
    operableFreq(al) {
      const { assign } = al.plan(this.day, al.activeRoutes().filter((r) => r.opened_day <= this.day));
      const cnt = {};
      for (const a of al.fleet) {
        const lst = assign[a.id] || [];
        a.used_hours = lst.reduce((s, x) => s + x[1], 0);
        a.assigned = lst.map((x) => x[0].id);
        for (const [r] of lst) cnt[r.id] = (cnt[r.id] || 0) + 1;
      }
      return cnt;
    }
    offerExtra(al, o, d) { return { brand: al.brand, extraU: al.extraU(o, d), bizPrem: al.bizPrem(), tax: this.taxAt(o, d) }; }
    buildMarkets() {
      const markets = new Map();
      const get = (k) => { if (!markets.has(k)) markets.set(k, { direct: [], conn: [] }); return markets.get(k); };
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        const fq = this.operableFreq(al), T = al.rampT();
        for (const r of al.activeRoutes()) {
          r.flyingToday = 0;
          if (r.opened_day > this.day) continue;
          r.applyPending(this.day);
          const f = fq[r.id] || 0;
          r.flyingToday = f;
          if (f <= 0) continue;
          const otp = al.otp(r.buffer);
          for (const [dir, o, d, fare] of [['out', r.base, r.dest, r.fare_out], ['in', r.dest, r.base, r.fare_in]]) {
            get(o + '-' + d).direct.push([offer(al.id, fare, f, r.seats(), r.service, otp, r.ramp(this.day, T), r.id, this.offerExtra(al, o, d)), r, dir]);
          }
        }
        for (const H of al.bases) {
          const spokes = al.activeRoutes().filter((r) => r.base === H && r.flyingToday > 0);
          for (const r1 of spokes) for (const r2 of spokes) {
            if (r1 === r2 || r1.dest === r2.dest) continue;
            const a = r1.dest, b = r2.dest, dab = gcDistanceKm(a, b);
            if (dab < P.TRANSFER.min_dist_km) continue;
            if ((gcDistanceKm(a, H) + gcDistanceKm(H, b)) / dab > P.TRANSFER.max_detour) continue;
            const of = offer(al.id, P.TRANSFER.discount * (r1.fare_in + r2.fare_out), Math.min(r1.flyingToday, r2.flyingToday), 0, r2.service,
              al.otp(r1.buffer) ** 1.5, Math.min(r1.ramp(this.day, T), r2.ramp(this.day, T)), `${r1.id}>${r2.id}`, this.offerExtra(al, a, b));
            of.conn = { r1, r2, hub: H };
            of.penalty = P.TRANSFER.penalty;
            get(a + '-' + b).conn.push(of);
          }
        }
      }
      return markets;
    }

    // Ein Tag
    step() {
      for (const al of this.list) if (al.isPlayer && al.status !== 'insolvent') this.completeDaily(al);
      const day = this.day, month = monthOf(day), dow = day % 7, cpi = this.macro.cpi;
      this.dailyEvents();
      this.maintenanceDaily();
      const markets = this.buildMarkets();
      this.accrueHours();
      const local = {}, connDemand = [];
      for (const [k, mk] of markets) {
        const [o, d] = k.split('-');
        const so = P.DEMAND_NOISE_SIGMA_OD, ss = P.DEMAND_NOISE_SIGMA_SEG;
        const eps = Math.exp(this.rng.gauss(0, so) - so * so / 2);
        const base = qPot(o, d, month, dow), pot = {}, tr = this.trendOf(o, d);
        for (const s of P.SEGMENTS) pot[s] = base[s] * eps * Math.exp(this.rng.gauss(0, ss) - ss * ss / 2) * tr * this.econFactor(o, d, s) * this.demandMult(o, d, s);
        const res = allocate(o, d, pot, withIndirect(o, d, mk.direct.map((x) => x[0]).concat(mk.conn), cpi), cpi);
        for (const [of, r, dir] of mk.direct) {
          const b = res.booked[of.key];
          local[r.id + '|' + dir] = { pax: b.leisure + b.business + b.vfr, biz: b.business, unc: res.unconstrained[of.key] || 0, fare: of.fare };
        }
        for (const of of mk.conn) { const b = res.booked[of.key], pax = b.leisure + b.business + b.vfr; if (pax > 0.01) connDemand.push({ of, pax, biz: b.business }); }
      }
      // Umsteiger auf Restkapazität: eine Reise, zwei Segmente, Erlös nach Distanz geteilt
      const legKey = (r, dir) => r.id + '|' + dir;
      const remaining = (r, dir) => { const l = local[legKey(r, dir)]; return Math.max(0, r.flyingToday * r.seats() - (l ? l.pax : 0)); };
      const legDem = {}, transfer = {};
      for (const c of connDemand) { const k1 = legKey(c.of.conn.r1, 'in'), k2 = legKey(c.of.conn.r2, 'out'); legDem[k1] = (legDem[k1] || 0) + c.pax; legDem[k2] = (legDem[k2] || 0) + c.pax; }
      for (const c of connDemand) {
        const { r1, r2 } = c.of.conn;
        const s = Math.min(1, remaining(r1, 'in') / legDem[legKey(r1, 'in')], remaining(r2, 'out') / legDem[legKey(r2, 'out')]);
        const pax = c.pax * s;
        if (pax <= 0) continue;
        const d1 = gcDistanceKm(r1.dest, r1.base), d2 = gcDistanceKm(r2.base, r2.dest);
        const rev = pax * c.of.fare + c.biz * s * c.of.fare * c.of.bizPrem;
        for (const [k, share, first] of [[legKey(r1, 'in'), d1 / (d1 + d2), true], [legKey(r2, 'out'), d2 / (d1 + d2), false]]) {
          if (!transfer[k]) transfer[k] = { pax: 0, rev: 0, anc: 0 };
          transfer[k].pax += pax; transfer[k].rev += rev * share; if (first) transfer[k].anc += pax;
        }
      }
      for (const al of this.list) if (al.isPlayer && al.status !== 'insolvent') this.staffCoverage(al);
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        for (const r of al.activeRoutes()) {
          if (!r.flyingToday) continue;
          const st = { flights: 0, seats: 0, cancelled: 0, cost: 0, block_h: 0, pax: 0, rev: 0, pax_out: 0, pax_in: 0, seats_out: 0, seats_in: 0, late: 0,
            demand_out: 0, demand_in: 0, spill_out: 0, spill_in: 0, tr_out: 0, tr_in: 0, cargo: 0 };
          for (const dir of ['out', 'in']) {
            const [o, d] = dir === 'out' ? [r.base, r.dest] : [r.dest, r.base];
            const l = local[legKey(r, dir)] || { pax: 0, biz: 0, unc: 0, fare: dir === 'out' ? r.fare_out : r.fare_in };
            const t = transfer[legKey(r, dir)] || { pax: 0, rev: 0, anc: 0 };
            st['demand_' + dir] += l.unc; st['spill_' + dir] += Math.max(0, l.unc - l.pax);
            this.fly(al, r, o, d, dir, l, t, st);
          }
          const keys = al.isPlayer ? HIST_KEYS : AI_HIST_KEYS, h = {};
          for (const k of HIST_KEYS) h[k] = 0;
          for (const k of keys) h[k] = k === 'block_h' ? r1(st[k] || 0) : Math.round(st[k] || 0);
          r.pushHist(h);
        }
      }
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        this.dailyFixed(al);
        this.liquidity(al);
        al.ledger.closeDay();
      }
      if (dow === 6) for (const al of this.list) if (al.status !== 'insolvent') this.weeklyPricing(al);
      this.fuelHist.push(this.fuelPrice); if (this.fuelHist.length > 400) this.fuelHist.shift();
      if (MONTH_STARTS.includes((day + 1) % 365)) this.monthEnd();
      this.day += 1;
    }
    staffCoverage(al) {
      const S = P.STAFF, st = al.staff, cpi = this.macro.cpi;
      const sick = this.events.some((e) => e.type === 'sickness' && e.airline === al.id && e.start <= this.day && e.end > this.day) ? 0.88 : 1;
      const need = { pil: zeroGroups(), cab: 0 };
      for (const r of al.activeRoutes()) {
        if (!r.flyingToday) continue;
        const t = P.AIRCRAFT_TYPES[r.type_id], leg = blockHours(r.base, r.dest, r.type_id), bh = leg * 2 * r.flyingToday;
        need.pil[t.group] += pilotsFor(leg) * bh; need.cab += t.cabin * bh;
      }
      for (const a of al.fleet) if (a.acmi && a.acmi.start <= this.day && a.acmi.end > this.day && a.status !== 'aog') { const t = P.AIRCRAFT_TYPES[a.type_id]; need.pil[t.group] += 16; need.cab += t.cabin * 8; }
      const techNeed = al.fleet.filter((a) => a.delivery_day <= this.day).length * S.techPerAc;
      const cov = { pil: {}, cab: 1, tech: techNeed ? Math.min(1, st.tech / techNeed) : 1, extraCost: 0, agencyH: 0, overtimeH: 0, cancel: { ...zeroGroups(), cab: 0 }, need, techNeed };
      const cover = (capH, needH, hourly, key) => {
        if (needH <= 0) return 1;
        capH *= sick;
        if (capH >= needH) return 1;
        const ot = Math.min(needH - capH, capH * S.overtimeMax);
        cov.extraCost += ot * hourly * S.overtime * cpi; cov.overtimeH += ot;
        let gap = needH - capH - ot;
        if (gap > 0 && st.agency) { cov.extraCost += gap * hourly * S.agency * cpi; cov.agencyH += gap; gap = 0; }
        cov.cancel[key] = gap > 0 ? gap / needH : 0;
        return 1 - cov.cancel[key];
      };
      for (const g of STAFF_GROUPS) cov.pil[g] = cover(st.pil[g] * S.pilotH, need.pil[g], al.staffHourly('pilot', g), g);
      cov.cab = cover(st.cab * S.cabinH, need.cab, al.staffHourly('cabin'), 'cab');
      st.cov = cov;
      if (cov.extraCost > 0) al.ledger.post('staff_extra', -cov.extraCost);
    }
    fly(al, r, o, d, dir, l, t, st) {
      const L = al.ledger, ty = P.AIRCRAFT_TYPES[r.type_id], bp = P.BUFFER_POLICY[r.buffer], cpi = this.macro.cpi;
      const f = r.flyingToday, seats = r.seats();
      const paxTotal = l.pax + t.pax, perFlight = paxTotal / f;
      const opsO = this.opsAt(o), opsD = this.opsAt(d), opsLv = al.skill('ops');
      const weatherCancel = (1 - (1 - opsO.cancel) * (1 - opsD.cancel)) * (1 - lv3([0, 0.2, 0.35, 0.5], opsLv));
      const strike = this.events.find((e) => e.type === 'own_strike' && e.airline === al.id && e.start <= this.day && e.end > this.day && !e.averted);
      const strikeCancel = strike ? 0.7 : 0;
      let staffCancel = 0;
      if (al.isPlayer && al.staff.cov) { const c = al.staff.cov.cancel; staffCancel = 1 - (1 - c[ty.group]) * (1 - c.cab); }
      let failRate = (1 - ty.dispatch_rel) * (1 + P.AGE.fail * this.ageOf(al, r)) * (1 - lv3([0, 0.2, 0.35, 0.5], al.skill('tech')));
      if (al.isPlayer && al.staff.cov && al.staff.cov.tech < 1) failRate *= 1 + 2 * (1 - al.staff.cov.tech);
      const itOut = this.events.some((e) => e.type === 'it_outage' && e.airline === al.id && e.start <= this.day && e.end > this.day);
      const shareLocal = paxTotal > 0 ? l.pax / paxTotal : 1;
      let flown = 0, flownLocal = 0, flownTr = 0, cancelledHere = 0;
      for (let i = 0; i < f; i++) {
        st.flights++; st.seats += seats;
        const rr = this.rng;
        const cancelled = rr.random() < failRate || rr.random() < weatherCancel || rr.random() < strikeCancel || rr.random() < staffCancel || (itOut && rr.random() < 0.1);
        if (cancelled) {
          st.cancelled++; cancelledHere++;
          const care = perFlight * (P.CANCEL_CARE_COST_PAX * cpi + P.EU261_CLAIM_RATE * eu261(gcDistanceKm(o, d)) * (weatherCancel > 0.05 ? 0.3 : 1));
          L.post('disruption', -care); st.cost += care; al.pushOtp(0);
          continue;
        }
        const yf = ty.yieldF || 1;
        const c = this.costsFor(al, r, o, d, perFlight, perFlight * shareLocal * l.fare * yf);
        const otpBase = bp.otp + lv3([0, 0.03, 0.05, 0.08], opsLv) - (opsO.delay + opsD.delay) / 120 - (itOut ? 0.4 : 0);
        const onTime = rr.random() < clamp(otpBase, 0.05, 0.98);
        const meanLate = Math.max(bp.mean_delay_min / (1 - bp.otp) - 15, 1) * (1 - lv3([0, 0.15, 0.25, 0.35], opsLv)) + opsO.delay + opsD.delay;
        const delay = onTime ? 0 : 15 + rr.expo(1 / meanLate);
        al.pushOtp(onTime ? 1 : 0);
        if (!onTime) st.late++;
        c.disruption = delay * ty.delay_cost_min;
        for (const k of COST_KEYS.concat(['disruption'])) { L.post(k, -c[k]); st.cost += c[k]; }
        st.block_h += c._bh;
        flown += perFlight; flownLocal += perFlight * shareLocal; flownTr += perFlight * (1 - shareLocal);
      }
      const locShare = l.pax > 0 ? flownLocal / l.pax : 0, trShare = t.pax > 0 ? flownTr / t.pax : 0;
      const yf = ty.yieldF || 1;
      const rev = (flownLocal * l.fare + l.biz * locShare * l.fare * al.bizPrem() + t.rev * trShare) * yf;
      const anc = (flownLocal + t.anc * trShare) * P.SERVICE[r.service].ancillary * cpi;
      L.post('rev_ticket', rev); L.post('rev_ancillary', anc);
      if (al.cargo && f > cancelledHere) {
        const cap = ty.cargo_kg * (f - cancelledHere) * P.CARGO.loadMax;
        const kg = Math.min(cap, cargoDemand(o, d, this.econFactor(o, d, 'business')) * this.cargoShare(o, d, r));
        if (kg > 0) {
          const crev = kg * cargoYield(o, d) * cpi;
          const ccost = kg * P.CARGO.handling * cpi + crev * (al.isPlayer ? P.CARGO.commission : 0.05);
          L.post('rev_cargo', crev); L.post('cargo_cost', -ccost);
          st.cargo += kg; st.rev += crev; st.cost += ccost;
        }
      }
      st.pax += flown; st.rev += rev + anc; st['pax_' + dir] += flown; st['tr_' + dir] += flownTr; st['seats_' + dir] += f * seats;
    }
    cargoShare(o, d, r) {
      let tot = 0, own = 0;
      for (const x of this.list) {
        if (!x.cargo || x.status === 'insolvent') continue;
        for (const q of x.activeRoutes()) {
          if (!q.flyingToday || !((q.base === o && q.dest === d) || (q.base === d && q.dest === o))) continue;
          const c = P.AIRCRAFT_TYPES[q.type_id].cargo_kg * q.flyingToday;
          tot += c; if (q === r) own += c;
        }
      }
      return tot ? own / tot : 0;
    }
    maintenanceDaily() {
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        for (const a of al.fleet) {
          if (a.delivery_day > this.day) continue;
          if ((a.status === 'ccheck' || a.status === 'aog') && a.until <= this.day) {
            al.log(this.day, a.status === 'ccheck' ? `${a.id}: C-Check abgeschlossen, wieder einsatzbereit` : `${a.id}: Reparatur abgeschlossen, wieder einsatzbereit`, 'fleet');
            a.status = 'ok'; a.until = null;
          }
          if (a.status === 'ok' && a.fh - a.lastC >= P.CCHECK_FH && !(a.acmi && a.acmi.start <= this.day && a.acmi.end > this.day)) {
            const days = Math.max(4, P.CCHECK_DAYS - (al.hangars.includes(a.base) ? P.HANGAR_CHECK_DAYS : 0) - al.skill('tech'));
            a.status = 'ccheck'; a.until = this.day + days; a.lastC = a.fh;
            al.log(this.day, `${a.id} (${P.AIRCRAFT_TYPES[a.type_id].label}) ist für ${days} Tage im C-Check`, al.isPlayer ? 'warn' : 'info');
          }
        }
      }
    }
    accrueHours() {
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        for (const a of al.fleet) {
          if (a.delivery_day > this.day) continue;
          if (a.status === 'ok') for (const rid of a.assigned || []) { const r = al.routes.find((x) => x.id === rid); if (r) a.fh += 2 * blockHours(r.base, r.dest, r.type_id); }
          if (a.acmi && a.acmi.start <= this.day && a.acmi.end > this.day) a.fh += 8;
        }
      }
    }
    dailyFixed(al) {
      const L = al.ledger, cpi = this.macro.cpi;
      let crewMin = 0;
      for (const a of al.fleet) {
        if (a.delivery_day > this.day) continue;
        const t = P.AIRCRAFT_TYPES[a.type_id];
        const value = a.owned ? a.nbv : t.value_eur * Math.max(0.2, 1 - P.AGE.value * Math.max(0, al.acAge(a, this.day) - t.age));
        L.post('insurance', -value * P.INSURANCE[al.insurance].rate / 365);
        L.post('overhead', -P.OVERHEAD_PER_AIRCRAFT_DAY * cpi);
        if (a.owned) {
          const v0 = a.value0 || t.value_eur;
          const dep = Math.round(Math.min(v0 * (1 - P.RESIDUAL_SHARE) / P.DEPRECIATION_YEARS / 365, Math.max(a.nbv - v0 * P.RESIDUAL_SHARE, 0)) * 100) / 100;
          L.post('depreciation', -dep, false); a.nbv = Math.round((a.nbv - dep) * 100) / 100;
          if (a.loan > 0) {
            const rate = a.loanRate || 0.06, interest = a.loan * rate / 365;
            L.post('interest', -interest);
            const rm = rate / 12, n = P.LOAN_TERM_YEARS * 12, orig = v0 * (1 - P.PURCHASE_DOWNPAYMENT);
            const annuity = orig * rm / (1 - (1 + rm) ** -n);
            const principal = Math.round(Math.max(Math.min(annuity / 30.4 - interest, a.loan), 0) * 100) / 100;
            L.cashOnly(-principal, 'loan_repay'); a.loan = Math.round((a.loan - principal) * 100) / 100;
          }
        } else L.post('lease', -(a.leaseUsd / this.macro.eurusd) * (1 + (a.flex ? P.FLEX_LEASE_PREMIUM : 0)) * 12 / 365);
        const onAcmi = a.acmi && a.acmi.start <= this.day && a.acmi.end > this.day;
        if (onAcmi) {
          if (a.status === 'aog') L.post('rev_acmi', -2 * a.acmi.rate);
          else { L.post('rev_acmi', a.acmi.rate); L.post('maintenance', -(t.maint_bh * 8 + t.maint_cycle * 3) * cpi); if (!al.isPlayer) L.post('crew', -t.crew_bh * 8 * cpi); }
        }
        if (!al.isPlayer) crewMin += t.crew_bh * P.CREW_MIN_BH_PER_DAY * cpi;
        a.idle_days = a.used_hours <= 0 && !onAcmi ? a.idle_days + 1 : 0;
      }
      if (!al.isPlayer) {
        const crewFlown = -(L.today.crew || 0) / 100;
        if (crewMin > crewFlown) L.post('crew', -(crewMin - crewFlown));
        const revToday = ((L.today.rev_ticket || 0) + (L.today.rev_ancillary || 0) + (L.today.rev_cargo || 0)) / 100;
        L.post('overhead', -revToday * ({ premium: 0.10, regional: 0.05, lcc: 0.05, leisure: 0.04 }[al.archetype] || 0.05));
        const stations = new Set(al.activeRoutes().filter((r) => r.opened_day <= this.day).map((r) => r.dest));
        L.post('overhead', -P.STATION_COST_DAY_AI * stations.size * cpi);
      }
      L.post('overhead', -al.stage().hq * cpi);
      L.post('overhead', -P.BASE_FIXED_DAY * (al.bases.length - 1) * cpi);
      L.post('overhead', -P.TYPE_COMPLEXITY_DAY * Math.max(new Set(al.fleet.map((a) => P.AIRCRAFT_TYPES[a.type_id].group)).size - 1, 0) * cpi);
      let slotFee = 0;
      for (const r of al.activeRoutes()) if (r.opened_day <= this.day) for (const x of [r.base, r.dest]) slotFee += apx(x).slotFee * r.freq;
      L.post('slots', -slotFee * cpi);
      if (al.creditUsed > 0) L.post('interest', -al.creditUsed * al.creditRate(this.macro.rate) / 365);
      for (const ln of al.loans) L.post('interest', -ln.balance * ln.rate / 365);
      if (al.isPlayer) this.playerDailyFixed(al);
    }
    playerDailyFixed(al) {
      const L = al.ledger, cpi = this.macro.cpi, S = P.STAFF, st = al.staff;
      const proc = 1 - lv3([0, 0.03, 0.06, 0.09], al.skill('procurement'));
      let pil = 0; for (const g of STAFF_GROUPS) pil += st.pil[g] * S.pilotSalary[g];
      for (const p of st.pipeline) if (p.kind === 'train') pil += p.count * S.pilotSalary[p.to];
      L.post('staff_cockpit', -pil * st.pay * cpi / 30.4);
      L.post('staff_cabin', -st.cab * S.cabinSalary * st.pay * cpi / 30.4);
      L.post('staff_tech', -st.tech * S.techSalary * st.pay * cpi / 30.4);
      const active = new Set(al.bases);
      for (const r of al.activeRoutes()) { active.add(r.base); active.add(r.dest); }
      let stations = 0;
      for (const apt of active) {
        const s = al.station(apt);
        stations += P.TERMINALS[s.terminal].rent * apx(apt).cost * cpi * proc / 30.4;
        if (s.handling === 'own') stations += P.OWN_HANDLING_DAY * apx(apt).cost * cpi;
      }
      for (const h of al.hangars) stations += P.HANGAR_MONTH * apx(h).cost * cpi * proc / 30.4;
      L.post('stations', -stations);
      L.post('experts', -al.experts.reduce((s, e) => s + e.salary, 0) * cpi / 30.4);
      if (al.marketing > 0) L.post('marketing', -al.marketing / 30.4);
      if (al.cargo) L.post('overhead', -P.CARGO.gsaMonth * cpi / 30.4);
    }
    liquidity(al) {
      const L = al.ledger, cash = L.cash / 100, limit = al.creditLimit();
      if (cash < 0) {
        const draw = Math.round(Math.min(-cash, limit - al.creditUsed) * 100) / 100;
        if (draw > 0) { al.creditUsed += draw; L.cashOnly(draw, 'credit_draw'); }
      } else if (al.creditUsed > 0 && cash > 0) {
        const repay = Math.round(Math.min(al.creditUsed, cash * 0.5) * 100) / 100;
        al.creditUsed -= repay; L.cashOnly(-repay, 'credit_repay');
      }
      const h = L.cashHist.slice(-30);
      if (h.length >= 10 && L.cash > 0) {
        const burn = (h[0] - L.cash / 100) / h.length;
        const runway = burn > 0 ? (L.cash / 100) / burn : Infinity;
        al.runway = runway;
        const level = P.LIQUIDITY_WARN_DAYS.find((lv) => runway < lv) ?? null;
        if (level !== null && al.warnLevel !== level) al.log(this.day, `Liquiditätswarnung: Das Geld reicht beim aktuellen Abfluss noch ${Math.round(runway)} Tage`, 'warn');
        al.warnLevel = level;
      } else if (L.cash <= 0) al.runway = 0;
      if (L.cash < 0) {
        al.distressDays++;
        if (al.distressDays === 1) al.log(this.day, `Kreditlinie ausgeschöpft, Kontostand negativ. Nach ${P.RESTRUCTURING_AFTER_DAYS} Tagen folgt die Restrukturierung.`, 'crit');
        if (al.distressDays === P.RESTRUCTURING_AFTER_DAYS) {
          al.status = 'restructuring';
          al.log(this.day, 'Restrukturierung: schwächstes Drittel der Strecken geschlossen, ungenutzte Flugzeuge abgegeben', 'crit');
          this.restructure(al);
        }
        if (al.distressDays >= P.INSOLVENCY_AFTER_DAYS) {
          al.status = 'insolvent';
          al.log(this.day, 'Insolvenz', 'crit');
          for (const r of al.activeRoutes()) { r.closed = true; r.closedDay = this.day; }
          this.pushNews(this.day, `${al.name} ist insolvent und stellt den Flugbetrieb ein`, 'crit', al.id);
        }
      } else { al.distressDays = 0; if (al.status === 'restructuring') al.status = 'active'; }
    }
    restructure(al) {
      const perf = al.activeRoutes().sort((a, b) => routeDb(a, 30, al) - routeDb(b, 30, al));
      for (const r of perf.slice(0, Math.max(1, Math.floor(perf.length / 3)))) al.closeRoute(this.day, r, 'Restrukturierung');
      this.operableFreq(al);
      for (const a of al.fleet.slice().sort((x, y) => x.used_hours - y.used_hours)) if (a.used_hours <= 0 && !a.acmi && a.status === 'ok') al.dispose(this.day, a, 'Restrukturierung');
    }
    competitorFares(aid, o, d) {
      const out = [];
      for (const al of this.list) {
        if (al.id === aid || al.status === 'insolvent') continue;
        for (const r of al.activeRoutes()) { if (r.base === o && r.dest === d) out.push(r.fare_out); else if (r.dest === o && r.base === d) out.push(r.fare_in); }
      }
      return out;
    }
    competitorOffers(aid, o, d) {
      const out = [];
      for (const al of this.list) {
        if (al.id === aid || al.status === 'insolvent') continue;
        for (const r of al.activeRoutes()) {
          if (r.base === o && r.dest === d) out.push(offer(al.id, r.fare_out, r.freq, r.seats(), r.service, al.otp(r.buffer), r.ramp(this.day, al.rampT()), r.id, this.offerExtra(al, o, d)));
          else if (r.dest === o && r.base === d) out.push(offer(al.id, r.fare_in, r.freq, r.seats(), r.service, al.otp(r.buffer), r.ramp(this.day, al.rampT()), r.id, this.offerExtra(al, o, d)));
        }
      }
      return out;
    }
    weeklyPricing(al) {
      const cfg = al.cfg, rm = al.skill('revenue');
      for (const r of al.activeRoutes()) {
        if (!r.autoPrice || r.hist.length < 7) continue;
        const last = r.hist.slice(-7), nw = [];
        for (const [dir, fare] of [['out', r.fare_out], ['in', r.fare_in]]) {
          let seats = 0, pax = 0, spill = 0, dem = 0;
          for (const h of last) { seats += h['seats_' + dir]; pax += h['pax_' + dir]; spill += h['spill_' + dir] || 0; dem += h['demand_' + dir] || 0; }
          const lf = seats ? pax / seats : 0;
          const ms = P.AUTO_PRICE.max_step * (rm >= 2 ? 1.25 : 1);
          let step = P.AUTO_PRICE.gain * (lf - r.targetLf);
          if (rm >= 2 && dem > 0 && spill / dem > 0.08) step = Math.max(step, 0.04);
          step = clamp(step, -ms, ms);
          let f = fare * (1 + step);
          const [o, d] = dir === 'out' ? [r.base, r.dest] : [r.dest, r.base];
          if (cfg && cfg.undercut > 0) {
            const comp = this.competitorFares(al.id, o, d);
            if (comp.length && Math.min(...comp) < f * 0.97) f = Math.max(f * (1 - ms), Math.min(...comp) * (1 - cfg.undercut / 2));
          }
          nw.push(Math.min(Math.max(f, priceFloor(o, d, r, this)), 2.5 * refPrice(o, d, this.macro.cpi)));
        }
        r.setFares(this.day, nw[0], nw[1]);
      }
    }
    monthEnd() {
      const m = monthOf(this.day), y = Math.floor(this.day / 365);
      this.monthlyMacro();
      this.generateMonthlyEvents();
      if (m === 2 || m === 9) for (const c in this.slotCap) this.slotCap[c] += 1;   // Sommer- und Winterflugplan: neue Slots
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        this.internalEvents(al);
        for (const ln of al.loans) {
          const interestM = ln.balance * ln.rate / 12, principal = Math.round(Math.min(ln.balance, ln.annuity - interestM) * 100) / 100;
          if (principal > 0) { al.ledger.cashOnly(-principal, 'loan_repay'); ln.balance = Math.round((ln.balance - principal) * 100) / 100; }
        }
        al.loans = al.loans.filter((ln) => ln.balance > 1);
        let total = 0;
        for (const k in al.ledger.pnl) if (k !== 'tax') total += al.ledger.pnl[k];
        const mp = (total - al.monthPnlStart) / 100;
        al.monthPnlStart = total;
        const taxable = mp - al.lossCarry;
        if (taxable > 0) { al.ledger.post('tax', -P.TAX_RATE * taxable); al.lossCarry = 0; }
        else al.lossCarry = (mp < 0 || al.lossCarry > 0) ? -taxable : 0;
        al.ledger.closeMonth({ y, m });
        this.updateRating(al);
        if (al.isPlayer) {
          const otp = al.otpHist.length ? al.otpHist.reduce((a, b) => a + b, 0) / al.otpHist.length : 0.8;
          const k = P.MARKETING_K * lv3([1, 1.3, 1.6, 2], al.skill('marketing'));
          const grow = k * Math.sqrt(Math.max(0, al.marketing) / 100000) * (1 - al.brand);
          al.brand = clamp(al.brand + grow - P.BRAND_DECAY * al.brand * 0.5 - (otp < 0.7 ? 0.01 : 0) + (al.activeRoutes().length ? 0.004 : 0), 0.05, 0.95);
          this.playerMonthly(al);
        }
        if (al.archetype && al.status === 'active') aiMonthly(this, al);
      }
      this.refreshOffers();
    }
    updateRating(al) {
      const bs = balanceSheet(al);
      const eqRatio = bs.equity / Math.max(bs.assets + bs.leaseLiab, 1);
      const ms = al.ledger.months.slice(-6);
      let ebit = 0, interest = 0;
      for (const mm of ms) for (const [k, v] of Object.entries(mm.acc)) { if (k.startsWith('cf_') || k === 'tax') continue; if (k === 'interest') interest -= v; else ebit += v; }
      const cov = interest > 0 ? ebit / interest : (ebit > 0 ? 10 : 0);
      let score = (eqRatio > 0.35 ? 3 : eqRatio > 0.2 ? 2 : eqRatio > 0.1 ? 1 : eqRatio > 0 ? 0 : -1) + (cov > 6 ? 2 : cov > 3 ? 1 : cov > 1 ? 0 : -1);
      if (ms.length < 3) score = Math.min(score, 2);
      al.rating = score >= 4 ? 'A' : score >= 3 ? 'BBB' : score >= 1 ? 'BB' : score >= 0 ? 'B' : 'CCC';
    }
    internalEvents(al) {
      const r = this.rng, mult = this.eventMult;
      for (const a of al.fleet) {
        if (a.delivery_day > this.day || a.status !== 'ok') continue;
        const p = P.AOG_MONTHLY * (1 + al.acAge(a, this.day) / 20) * (1 - lv3([0, 0.2, 0.35, 0.5], al.skill('tech'))) * mult;
        if (r.random() < p) {
          const days = r.int(P.AOG_DAYS[0], P.AOG_DAYS[1]), cost = r.range(P.AOG_COST[0], P.AOG_COST[1]);
          const own = Math.min(cost, P.INSURANCE[al.insurance].deductible);
          a.status = 'aog'; a.until = this.day + days;
          al.ledger.post('maintenance', -own);
          al.log(this.day, `Triebwerksschaden an ${a.id} (${P.AIRCRAFT_TYPES[a.type_id].label}): ${days} Tage am Boden. Reparatur ${Math.round(cost / 1000)} Tsd. EUR, Selbstbehalt ${Math.round(own / 1000)} Tsd. EUR.`, 'crit');
          if (!al.isPlayer) this.pushNews(this.day, `${al.name}: Flugzeug nach Triebwerksschaden am Boden`, 'ai', al.id);
        }
      }
      if (r.random() < 0.012 * mult * (1 - lv3([0, 0.2, 0.35, 0.5], al.skill('ops')))) {
        this.events.push({ id: 'E' + (++this.eventCounter), type: 'it_outage', airline: al.id, scope: 'airline', announced: this.day, start: this.day + 1, end: this.day + 2, text: `${al.name}: IT-Ausfall` });
        if (al.isPlayer) al.log(this.day, 'IT-Störung angekündigt: Morgen fällt das Abfertigungssystem teilweise aus. Viele Verspätungen, einzelne Ausfälle.', 'warn');
      }
      const m = monthOf(this.day);
      if (al.isPlayer && [10, 11, 0, 1].includes(m) && r.random() < 0.04 * mult) {
        this.events.push({ id: 'E' + (++this.eventCounter), type: 'sickness', airline: al.id, scope: 'airline', start: this.day + 1, end: this.day + 15, announced: this.day, text: 'Grippewelle' });
        al.log(this.day, 'Grippewelle: Für zwei Wochen fehlen rund 12 % der Crews', 'warn');
      }
      const morale = al.staff ? al.staff.morale : 0.7;
      const pStrike = (0.004 + Math.max(0, 0.55 - morale) * 0.3) * (1 - lv3([0, 0.3, 0.5, 0.65], al.skill('hr'))) * mult;
      const staffSize = al.staff ? al.staff.cab + al.staff.tech + Object.values(al.staff.pil).reduce((a, b) => a + b, 0) : 50;
      if (staffSize >= 20 && r.random() < pStrike && !this.events.some((e) => e.type === 'own_strike' && e.airline === al.id && e.end > this.day)) {
        const ev = { id: 'E' + (++this.eventCounter), type: 'own_strike', airline: al.id, scope: 'airline', announced: this.day, start: this.day + 5, end: this.day + 7, averted: false, text: `${al.name}: Streik der Crews` };
        this.events.push(ev);
        if (al.isPlayer) {
          al.decisions.push({ id: ev.id, type: 'strike', day: this.day, deadline: this.day + 4, eventId: ev.id, text: `Die Gewerkschaft fordert mehr Gehalt und droht ab Tag ${this.day + 6} mit einem zweitägigen Streik. Rund 70 % der Flüge würden ausfallen.` });
          al.log(this.day, 'Streikdrohung: Die Gewerkschaft fordert mehr Gehalt. Entscheidung im Cockpit nötig.', 'crit');
        } else this.pushNews(this.day, `${al.name}: Crews kündigen Streik an`, 'ai', al.id);
      }
    }
    playerMonthly(al) {
      const st = al.staff, S = P.STAFF, r = this.rng;
      const leaveRate = S.attrition + Math.max(0, 0.5 - st.morale) * 0.04;
      const leave = (n) => { let k = 0; for (let i = 0; i < n; i++) if (r.random() < leaveRate) k++; return k; };
      let left = 0;
      for (const g of STAFF_GROUPS) { const k = leave(st.pil[g]); st.pil[g] -= k; left += k; }
      const kc = leave(st.cab), kt = leave(st.tech); st.cab -= kc; st.tech -= kt; left += kc + kt;
      if (left > 0) al.log(this.day, `${left} Beschäftigte haben gekündigt (Stimmung ${Math.round(st.morale * 100)} %)`, left > 3 ? 'warn' : 'info');
      const cov = st.cov;
      let overload = 0;
      if (cov) {
        for (const g of STAFF_GROUPS) if (cov.need.pil[g] > 0 && st.pil[g] > 0) overload = Math.max(overload, cov.need.pil[g] / (st.pil[g] * S.pilotH) - 1);
        if (cov.need.cab > 0 && st.cab > 0) overload = Math.max(overload, cov.need.cab / (st.cab * S.cabinH) - 1);
      }
      const target = clamp(0.62 + 1.6 * (st.pay - 1) - 1.2 * Math.max(0, Math.min(overload, 0.3)) + lv3([0, 0.05, 0.1, 0.15], al.skill('hr')), 0.05, 0.97);
      st.morale = clamp(st.morale + 0.35 * (target - st.morale), 0, 1);
    }
    completeDaily(al) {
      const st = al.staff;
      for (const p of st.pipeline.filter((x) => x.ready <= this.day)) {
        if (p.kind === 'hire') { if (p.role === 'pilot') st.pil[p.group] += p.count; else if (p.role === 'cabin') st.cab += p.count; else st.tech += p.count; }
        if (p.kind === 'train') st.pil[p.to] += p.count;
        al.log(this.day, p.kind === 'train' ? `${p.count} Piloten haben die Musterberechtigung ${P.TYPE_GROUPS[p.to]} erworben` : `${p.count} ${roleLabel(p.role, p.group)} haben angefangen`, 'staff');
      }
      st.pipeline = st.pipeline.filter((p) => p.ready > this.day);
      for (const [k, s] of Object.entries(al.studies)) if (!s.done && s.ready <= this.day) { s.done = true; al.log(this.day, `Marktstudie ${k} liegt vor`, 'good'); }
      for (const dcs of al.decisions) if (!dcs.resolved && dcs.deadline < this.day) { dcs.resolved = 'ignored'; al.log(this.day, 'Keine Antwort an die Gewerkschaft: Der Streik findet statt', 'warn'); }
    }
    refreshOffers() {
      const r = this.rng, day = this.day;
      this.candidates = this.candidates.filter((c) => c.expires > day);
      const roles = Object.keys(P.EXPERT_ROLES);
      while (this.candidates.length < 8) {
        const role = r.pick(roles), level = r.random() < 0.45 ? 1 : r.random() < 0.7 ? 2 : 3;
        const years = level === 1 ? r.int(2, 6) : level === 2 ? r.int(7, 14) : r.int(15, 28);
        const salary = Math.round(P.EXPERT_ROLES[role].salary[level - 1] * r.range(0.9, 1.15) * this.macro.cpi / 100) * 100;
        this.candidates.push({ id: 'C' + (++this.offerCounter), name: `${r.pick(FIRST)} ${r.pick(LAST)}`, role, level, years, region: r.pick(Object.keys(P.REGIONS)), salary,
          trait: r.pick(TRAITS), prev: r.pick(PREV), expires: day + r.int(25, 50) });
      }
      this.acMarket = this.acMarket.filter((o) => o.expires > day);
      while (this.acMarket.length < 12) {
        const typeId = r.pick(Object.keys(P.AIRCRAFT_TYPES)), t = P.AIRCRAFT_TYPES[typeId];
        const age = t.age >= 10 ? r.int(t.age - 3, t.age + 7) : r.random() < 0.3 ? r.int(0, 2) : r.int(3, 16);
        const rel = Math.max(0, age - t.age);
        this.acMarket.push({ id: 'A' + (++this.offerCounter), type: typeId, age, lease_month: Math.round(t.lease_month * (1 - P.AGE.lease * rel) * r.range(0.93, 1.08) * this.macro.cpi / 1000) * 1000,
          price: Math.round(t.value_eur * Math.max(0.25, 1 - P.AGE.value * rel) * r.range(0.92, 1.06) / 1e5) * 1e5, delivery: r.int(10, 40), fhSinceC: r.int(0, P.CCHECK_FH - 500),
          expires: day + r.int(20, 60), kind: r.random() < 0.65 ? 'lease' : 'buy' });
      }
      this.acmiOffers = this.acmiOffers.filter((o) => o.expires > day);
      while (this.acmiOffers.length < 4) {
        const typeId = r.pick(['AT76', 'DH8D', 'E295', 'BCS3', 'A20N', 'A20N', 'B38M', 'A21N', 'A339', 'B789', 'A359']), t = P.AIRCRAFT_TYPES[typeId];
        const start = day + r.int(10, 35), dur = r.pick([14, 21, 30, 45, 60, 90]);
        const client = r.pick(['Reiseveranstalter SunTours', 'Netzwerkcarrier mit Flugzeugmangel', 'Sportverband für Mannschaftsflüge', 'Kreuzfahrtreederei', 'Ferienairline in der Hochsaison', 'Regierungsdelegation']);
        this.acmiOffers.push({ id: 'W' + (++this.offerCounter), client, type: typeId, start, end: start + dur, rate: Math.round(t.acmi_day * r.range(0.9, 1.2) * this.macro.cpi / 100) * 100, expires: start - 3 });
      }
    }

    // Spieleraktionen
    hire(al, role, group, count) {
      const S = P.STAFF, st = al.staff;
      const hrF = lv3([1, 0.75, 0.6, 0.5], al.skill('hr'));
      const tight = role === 'pilot' ? this.macro.laborTight : 1;
      const lead = Math.round(S.lead[role] * hrF * tight);
      if (!(count > 0)) return { ok: false, msg: 'Bitte eine Anzahl angeben.' };
      const month = Math.floor(this.day / 30);
      const inPipe = st.pipeline.filter((p) => p.kind === 'hire' && p.role === role && p.month === month).reduce((s, p) => s + p.count, 0);
      const maxN = Math.floor(S.maxHire[role] / tight);
      if (inPipe + count > maxN) return { ok: false, msg: `Der Arbeitsmarkt gibt diesen Monat nur noch ${Math.max(0, maxN - inPipe)} ${roleLabel(role, group)} her.` };
      const cost = S.recruit[role] * count * this.macro.cpi * tight;
      al.ledger.post('staff_extra', -cost);
      st.pipeline.push({ kind: 'hire', role, group, count, ready: this.day + lead, month });
      al.log(this.day, `${count} ${roleLabel(role, group)} eingestellt, Start in ${lead} Tagen`, 'staff');
      return { ok: true, lead, cost };
    }
    fire(al, role, group, count) {
      const S = P.STAFF, st = al.staff;
      const have = role === 'pilot' ? st.pil[group] : role === 'cabin' ? st.cab : st.tech;
      count = Math.min(count, have);
      if (count <= 0) return { ok: false, msg: 'Niemand zu entlassen.' };
      const sal = role === 'pilot' ? S.pilotSalary[group] : role === 'cabin' ? S.cabinSalary : S.techSalary;
      const cost = count * sal * st.pay * S.severanceMonths * this.macro.cpi;
      al.ledger.post('staff_extra', -cost);
      if (role === 'pilot') st.pil[group] -= count; else if (role === 'cabin') st.cab -= count; else st.tech -= count;
      st.morale = clamp(st.morale - 0.02 * Math.min(5, count), 0, 1);
      al.log(this.day, `${count} ${roleLabel(role, group)} entlassen, Abfindung ${Math.round(cost / 1000)} Tsd. EUR`, 'staff');
      return { ok: true, cost };
    }
    train(al, from, to, count) {
      const st = al.staff, S = P.STAFF;
      count = Math.min(count, st.pil[from]);
      if (count <= 0 || from === to) return { ok: false, msg: 'Keine Piloten zum Umschulen.' };
      st.pil[from] -= count;
      st.pipeline.push({ kind: 'train', from, to, count, ready: this.day + S.trainDays });
      al.ledger.post('staff_extra', -count * S.trainCost * this.macro.cpi);
      al.log(this.day, `${count} Piloten in Umschulung ${P.TYPE_GROUPS[from]} → ${P.TYPE_GROUPS[to]} (${S.trainDays} Tage)`, 'staff');
      return { ok: true };
    }
    hireExpert(al, cid) {
      const c = this.candidates.find((x) => x.id === cid);
      if (!c) return { ok: false, msg: 'Die Person ist nicht mehr verfügbar.' };
      if (al.experts.filter((e) => e.role === c.role).length >= P.EXPERT_ROLES[c.role].max) return { ok: false, msg: `${P.EXPERT_ROLES[c.role].label} ist schon besetzt. Erst die bisherige Person freistellen.` };
      al.experts.push({ ...c, hiredDay: this.day });
      al.ledger.post('experts', -c.salary);
      this.candidates = this.candidates.filter((x) => x !== c);
      al.log(this.day, `${c.name} beginnt in ${P.EXPERT_ROLES[c.role].label} (${['', 'Junior', 'Senior', 'Expertin/Experte'][c.level]})`, 'staff');
      return { ok: true };
    }
    fireExpert(al, id) {
      const e = al.experts.find((x) => x.id === id); if (!e) return { ok: false };
      al.ledger.post('experts', -e.salary * 3);
      al.experts = al.experts.filter((x) => x !== e);
      al.log(this.day, `${e.name} freigestellt, Abfindung drei Monatsgehälter`, 'staff');
      return { ok: true };
    }
    commissionStudy(al, a, b) {
      const lv = al.skill('analyst');
      if (!lv) return { ok: false, msg: 'Für Marktstudien brauchen Sie eine Person in der Marktanalyse.' };
      const k = pairKey(a, b);
      if (al.studies[k] && !al.studies[k].done) return { ok: false, msg: 'Diese Studie läuft bereits.' };
      const an = al.experts.filter((e) => e.role === 'analyst').sort((x, y) => y.level - x.level)[0];
      const regional = P.REGIONS[an.region] && (P.REGIONS[an.region].includes(a) || P.REGIONS[an.region].includes(b));
      const days = Math.round(P.STUDY_DAYS[lv - 1] * (regional ? 0.6 : 1)), err = P.STUDY_ERR[lv - 1] * (regional ? 0.6 : 1);
      al.studies[k] = { ready: this.day + days, est: this.trendOf(a, b) * Math.exp(this.rng.gauss(0, err)), err, done: false, by: an.name, day: this.day };
      al.ledger.post('one_off', -P.STUDY_COST * this.macro.cpi);
      al.log(this.day, `Marktstudie ${k} beauftragt (${an.name}, fertig in ${days} Tagen)`, 'info');
      return { ok: true, days };
    }
    knownTrend(al, a, b) { const s = al.studies[pairKey(a, b)]; return s && s.done ? s.est : 1; }
    forecastBand(al) { return lv3([0.25, 0.18, 0.12, 0.08], al.skill('analyst')); }
    setHedge(al, share, months) {
      const H = P.FUEL_HEDGE, prem = H.premium - lv3([0, 0.005, 0.01, 0.015], al.skill('procurement'));
      share = clamp(share, 0, H.maxShare);
      if (share <= 0) { al.hedge = null; al.log(this.day, 'Kerosin wird wieder vollständig zum Tagespreis gekauft', 'info'); return { ok: true }; }
      const price = this.fuelPrice * (1 + H.contango * months / 3);
      const cost = share * this.estFuelKgMonth(al) * this.fuelPrice * prem * months;
      al.ledger.post('hedge', -cost);
      al.hedge = { share, price, until: this.day + Math.round(months * 30.4), months, cost, from: this.day };
      al.log(this.day, `Kerosin abgesichert: ${Math.round(share * 100)} % für ${months} Monate zu ${price.toFixed(3).replace('.', ',')} EUR/kg, Prämie ${Math.round(cost / 1000)} Tsd. EUR`, 'info');
      return { ok: true, cost, price };
    }
    hedgeQuote(al, share, months) {
      const H = P.FUEL_HEDGE, prem = H.premium - lv3([0, 0.005, 0.01, 0.015], al.skill('procurement'));
      return { price: this.fuelPrice * (1 + H.contango * months / 3), cost: clamp(share, 0, H.maxShare) * this.estFuelKgMonth(al) * this.fuelPrice * prem * months, prem };
    }
    estFuelKgMonth(al) {
      let kg = 0;
      for (const r of al.activeRoutes()) { const t = P.AIRCRAFT_TYPES[r.type_id], bh = blockHours(r.base, r.dest, r.type_id); kg += 2 * r.freq * (t.fuel_cycle_kg + t.fuel_bh_kg * bh); }
      return kg * 30.4;
    }
    loanRate(al) { return this.macro.rate + al.ratingInfo().spread + 0.01 - lv3([0, 0.005, 0.01, 0.015], al.skill('finance')); }
    loanLimit(al) {
      if (al.rating === 'CCC') return 0;
      const f = { A: 1.0, BBB: 0.8, BB: 0.5, B: 0.3 }[al.rating] || 0.3;
      return Math.max(0, f * balanceSheet(al).equity - al.loans.reduce((s, l) => s + l.balance, 0));
    }
    takeLoan(al, amount, years) {
      const rate = this.loanRate(al), maxAmt = this.loanLimit(al);
      if (!(amount > 0)) return { ok: false, msg: 'Bitte einen Betrag angeben.' };
      if (amount > maxAmt + 1) return { ok: false, msg: `Die Bank gibt bei Rating ${al.rating} höchstens ${(maxAmt / 1e6).toFixed(1).replace('.', ',')} Mio. EUR.` };
      const rm = rate / 12, n = years * 12, annuity = amount * rm / (1 - (1 + rm) ** -n);
      al.loans.push({ id: 'L' + (++this.offerCounter), amount, balance: amount, rate, years, annuity, day: this.day });
      al.ledger.cashOnly(amount, 'loan_draw');
      al.log(this.day, `Bankkredit über ${(amount / 1e6).toFixed(1).replace('.', ',')} Mio. EUR, ${years} Jahre, ${(rate * 100).toFixed(1).replace('.', ',')} % Zins`, 'info');
      return { ok: true, rate, annuity };
    }
    repayLoan(al, id) {
      const ln = al.loans.find((x) => x.id === id); if (!ln) return { ok: false };
      if (al.ledger.cash / 100 < ln.balance * 1.01) return { ok: false, msg: 'Dafür reicht der Kontostand nicht.' };
      al.ledger.cashOnly(-ln.balance, 'loan_repay'); al.ledger.post('interest', -ln.balance * 0.01);
      al.loans = al.loans.filter((x) => x !== ln);
      al.log(this.day, 'Kredit vorzeitig zurückgezahlt (1 % Vorfälligkeitsgebühr)', 'info');
      return { ok: true };
    }
    acceptAcmi(al, offerId, acId) {
      const o = this.acmiOffers.find((x) => x.id === offerId), a = al.fleet.find((x) => x.id === acId);
      if (!o || !a) return { ok: false, msg: 'Angebot oder Flugzeug nicht gefunden.' };
      if (a.type_id !== o.type) return { ok: false, msg: `Der Kunde will eine ${P.AIRCRAFT_TYPES[o.type].label}.` };
      if (a.acmi && a.acmi.end > o.start) return { ok: false, msg: 'Das Flugzeug ist in dem Zeitraum schon verchartert.' };
      if (a.delivery_day > o.start) return { ok: false, msg: 'Das Flugzeug ist bis dahin noch nicht geliefert.' };
      a.acmi = { start: o.start, end: o.end, rate: o.rate, client: o.client };
      this.acmiOffers = this.acmiOffers.filter((x) => x !== o);
      al.log(this.day, `${a.id} an ${o.client} verchartert, ${o.end - o.start} Tage zu ${Math.round(o.rate / 100) / 10} Tsd. EUR pro Tag`, 'fleet');
      return { ok: true };
    }
    takeMarketAircraft(al, offerId, mode, base) {
      const o = this.acMarket.find((x) => x.id === offerId); if (!o) return { ok: false, msg: 'Das Angebot ist nicht mehr verfügbar.' };
      const ac = al.acquire(this.day, o.type, base, mode, o, this);
      this.acMarket = this.acMarket.filter((x) => x !== o);
      return { ok: true, ac };
    }
    openBase(al, apt) {
      if (al.bases.includes(apt)) return { ok: false, msg: 'Dort sind Sie schon.' };
      al.bases.push(apt); al.station(apt);
      al.ledger.post('one_off', -P.BASE_SETUP_COST * this.macro.cpi);
      al.log(this.day, `Neue Basis ${ap(apt).name} eröffnet`, 'route');
      return { ok: true };
    }
    moveAircraft(al, acId, base) {
      const a = al.fleet.find((x) => x.id === acId); if (!a || !al.bases.includes(base)) return { ok: false };
      a.base = base; al.ledger.post('one_off', -12000 * this.macro.cpi);
      al.log(this.day, `${a.id} nach ${ap(base).name} umstationiert`, 'fleet');
      return { ok: true };
    }
    resolveDecision(al, id, choice) {
      const dcs = al.decisions.find((x) => x.id === id); if (!dcs || dcs.resolved) return;
      dcs.resolved = choice;
      if (dcs.type === 'strike') {
        const ev = this.events.find((e) => e.id === dcs.eventId);
        if (choice === 'raise5') { al.staff.pay += 0.05; al.staff.morale = clamp(al.staff.morale + 0.12, 0, 1); if (ev) ev.averted = true; al.log(this.day, 'Tarifeinigung: +5 % Gehalt, der Streik ist abgesagt', 'good'); }
        else if (choice === 'bonus') {
          al.ledger.post('staff_extra', -al.staffMonthly(this.macro.cpi) * 0.5); al.staff.morale = clamp(al.staff.morale + 0.06, 0, 1);
          const ok = this.rng.random() < 0.6; if (ev) ev.averted = ok;
          al.log(this.day, ok ? 'Einmalzahlung angenommen, kein Streik' : 'Einmalzahlung abgelehnt, der Streik findet statt', ok ? 'good' : 'warn');
        } else { al.staff.morale = clamp(al.staff.morale - 0.05, 0, 1); al.log(this.day, 'Forderung abgelehnt: Der Streik findet statt', 'warn'); }
      }
    }
  }

  // ===========================================================================
  // KI
  // ===========================================================================
  function aiOpen(w, al, spec, why) {
    al.openRoute(w.day + P.LEASE_DELIVERY_DAYS, spec.base, spec.dest, spec.type_id, spec.freq, spec.fare_out, spec.fare_in, spec.service, spec.buffer, al.cfg.target_lf, true, false);
    w.pushNews(w.day, `${al.name} kündigt ${ap(spec.base).name}–${ap(spec.dest).name} an: ${spec.freq}x täglich, ab ${Math.round(Math.min(spec.fare_out, spec.fare_in))} EUR${why ? ' · ' + why : ''}`, 'ai', al.id);
  }
  function aiSpec(w, al, base, dest, typeId, freq) {
    const cfg = al.cfg, cpi = w.macro.cpi;
    const co = w.competitorOffers(al.id, base, dest), ci = w.competitorOffers(al.id, dest, base);
    return { co, ci, spec: { airline: al.id, base, dest, type_id: typeId, freq, fare_out: aiRulePrice(base, dest, cfg, co.map((c) => c.fare), cpi),
      fare_in: aiRulePrice(dest, base, cfg, ci.map((c) => c.fare), cpi), service: cfg.service, buffer: cfg.buffer } };
  }
  function aiEval(w, al, x, month, nDraws) {
    const noise = Math.exp(al.rngForecast.gauss(0, al.cfg.forecast_sigma));
    return evaluateRoute(x.spec, x.co, x.ci, { month, nDraws, seed: w.day, fuelPrice: w.fuelPrice, demandScale: noise, cpi: w.macro.cpi,
      segScale: { out: w.segScale(x.spec.base, x.spec.dest), in: w.segScale(x.spec.dest, x.spec.base) },
      offerExtra: { out: w.offerExtra(al, x.spec.base, x.spec.dest), in: w.offerExtra(al, x.spec.dest, x.spec.base) } });
  }
  function aiBaseExpansion(w, al) {
    const rule = P.AI_BASE_EXPANSION[al.archetype];
    if (!rule || al.bases.length >= rule.max_bases) return false;
    const cfg = al.cfg, typeId = cfg.pref_types[0];
    let best = null;
    const served = new Set(al.activeRoutes().map((r) => pairKey(r.base, r.dest)));
    const near = AP_CODES.filter((c) => !al.bases.includes(c) && al.bases.some((b) => gcDistanceKm(b, c) < 2500 && ap(b).region === ap(c).region))
      .sort((a, b) => ap(b).pop * ap(b).income - ap(a).pop * ap(a).income).slice(0, 6);
    for (const nb of near) {
      if (al.bases.includes(nb)) continue;
      if (al.archetype === 'premium' && ap(nb).biz < 1.0) continue;
      if (w.slotsFree(nb) < 2) continue;
      const cands = [];
      for (const dest of aiCandidates(al, nb, new Set(), 8)) {
        if (!rangeOk(nb, dest, typeId) || served.has(pairKey(nb, dest)) || !w.slotsOk(nb, dest, 1)) continue;
        const x = aiSpec(w, al, nb, dest, typeId, 1);
        cands.push([aiEval(w, al, x, null, 2).db2, x.spec]);
      }
      cands.sort((a, b) => b[0] - a[0]);
      const pkg = cands.slice(0, 2);
      const value = pkg.reduce((s, x) => s + x[0], 0) - P.BASE_FIXED_DAY - 2 * P.STATION_COST_DAY_AI - P.BASE_SETUP_COST / 365;
      if (value > rule.hurdle_day && (!best || value > best[0])) best = [value, nb, pkg];
    }
    if (!best) return false;
    if (al.ledger.cash / 100 < P.BASE_SETUP_COST + 90 * (6000 + 2 * 12000)) return false;
    const [, nb, pkg] = best;
    al.bases.push(nb);
    al.ledger.post('one_off', -P.BASE_SETUP_COST);
    w.pushNews(w.day, `${al.name} eröffnet eine Basis in ${ap(nb).name}`, 'ai', al.id);
    for (const [, spec] of pkg) {
      if (!al.spareCapacity(w.day, spec.type_id, nb, rotationHours(spec.base, spec.dest, spec.type_id, spec.service, spec.buffer))) al.acquire(w.day, spec.type_id, nb, 'lease', null, w);
      aiOpen(w, al, spec, 'neue Basis');
    }
    return true;
  }
  function potSum(o, d) { const q = qBase(o, d); return (q.leisure + q.business + q.vfr) * accessibility(o, d); }
  /** Vorauswahl: die aussichtsreichsten freien Ziele nach Potenzial (sonst wären es über 100 Ziele je Basis). */
  function aiCandidates(al, base, served, k) {
    const maxR = Math.max(...al.cfg.pref_types.map((t) => P.AIRCRAFT_TYPES[t].range_km));
    return AP_CODES.filter((d) => d !== base && !served.has(base + d) && destFits(al.archetype, base, d) && gcDistanceKm(base, d) * P.ROUTE_DETOUR <= maxR)
      .sort((a, b) => potSum(base, b) - potSum(base, a)).slice(0, k);
  }
  function aiMonthly(w, al) {
    const cfg = al.cfg, day = w.day;
    for (const r of al.activeRoutes()) {
      if (day - r.opened_day < 60 || day - r.lastChange < 60) continue;
      const db = routeDb(r, 30, al), lf = routeLf(r, 30);
      r.reviewNeg = db < 0 ? r.reviewNeg + 1 : 0;
      if (r.reviewNeg >= 2) {
        if (r.freq > 1) { r.freq--; r.reviewNeg = 0; r.lastChange = day; w.pushNews(day, `${al.name} reduziert ${ap(r.base).name}–${ap(r.dest).name} auf ${r.freq}x täglich`, 'ai', al.id); }
        else { al.closeRoute(day, r, 'zwei Monate negativer Streckenbeitrag'); w.pushNews(day, `${al.name} stellt ${ap(r.base).name}–${ap(r.dest).name} ein`, 'ai', al.id); }
      } else if (lf > 0.90 && db > 0 && w.slotsOk(r.base, r.dest, 1)) {
        if (al.spareCapacity(day, r.type_id, r.base, rotationHours(r.base, r.dest, r.type_id, r.service, r.buffer))) { r.freq++; r.lastChange = day; w.pushNews(day, `${al.name} erhöht ${ap(r.base).name}–${ap(r.dest).name} auf ${r.freq}x täglich`, 'ai', al.id); }
      }
    }
    w.operableFreq(al);
    for (const a of al.fleet.slice()) if (a.idle_days >= 45 && a.delivery_day < day && a.status === 'ok') al.dispose(day, a, 'dauerhaft ungenutzt');
    if (al.fleet.length >= al.maxFleet) return;
    if (monthOf(day) % 3 === 0 && aiBaseExpansion(w, al)) return;
    const reserve = 60 * (6000 + al.fleet.reduce((s, a) => s + aircraftDayFixedGeneric(a.type_id), 0));
    if (al.ledger.cash / 100 < reserve) return;
    const served = new Set(al.activeRoutes().flatMap((r) => [r.base + r.dest, r.dest + r.base]));
    const monthEval = al.archetype === 'leisure' ? (monthOf(day) + 1) % 12 : null;
    let best = null;
    for (const base of al.bases) for (const dest of aiCandidates(al, base, served, 10)) {
      for (const typeId of cfg.pref_types) {
        if (!rangeOk(base, dest, typeId)) continue;
        for (const freq of [1, 2, 3]) {
          if (!w.slotsOk(base, dest, freq)) continue;
          const x = aiSpec(w, al, base, dest, typeId, freq), res = aiEval(w, al, x, monthEval, 3);
          if (res.margin >= cfg.min_margin + 0.05 && res.db2 > 0 && (!best || res.db2 > best[0])) best = [res.db2, x.spec];
        }
      }
    }
    if (best) {
      const [, spec] = best, h = rotationHours(spec.base, spec.dest, spec.type_id, spec.service, spec.buffer);
      let guard = 0;
      while (!al.spareCapacity(day, spec.type_id, spec.base, h) && guard++ < 4) al.acquire(day, spec.type_id, spec.base, 'lease', null, w);
      if (!al.spareCapacity(day, spec.type_id, spec.base, h * spec.freq) && spec.freq > 1) al.acquire(day, spec.type_id, spec.base, 'lease', null, w);
      aiOpen(w, al, spec, '');
    }
  }

  // ===========================================================================
  // Startwelt
  // ===========================================================================
  const AI_SETUP = {
    AUR: ['Aurelion Airways', 'premium', 'FRA', 150e6, 22, [['LHR', 'A20N', 4], ['CDG', 'E295', 3], ['AMS', 'E295', 3], ['BER', 'A20N', 3], ['HAM', 'E295', 3], ['MUC', 'E295', 3], ['VIE', 'E295', 2], ['BCN', 'A20N', 2], ['FCO', 'A20N', 2], ['LIS', 'A20N', 1], ['PMI', 'A20N', 1]]],
    KES: ['Kestrel Air', 'lcc', 'BER', 80e6, 16, [['BCN', 'B38M', 2], ['PMI', 'B38M', 1], ['FCO', 'B38M', 2], ['LHR', 'B38M', 2], ['LIS', 'B38M', 1], ['CDG', 'B38M', 2], ['AMS', 'B38M', 1], ['VIE', 'B38M', 1]], ['B38M']],
    REG: ['Regiolink', 'regional', 'MUC', 50e6, 12, [['VIE', 'DH8D', 3], ['HAM', 'E295', 2], ['BER', 'E295', 2], ['DUS', 'E295', 2], ['AMS', 'E295', 2], ['CDG', 'E295', 2]]],
    SOL: ['Solvento', 'leisure', 'DUS', 60e6, 10, [['PMI', 'A21N', 2], ['BCN', 'A21N', 1], ['LIS', 'A21N', 1], ['FCO', 'A21N', 1]]],
    ALB: ['Albion Skyways', 'premium', 'LHR', 150e6, 22, [['FRA', 'A20N', 3], ['AMS', 'A20N', 3], ['MUC', 'A20N', 2], ['BER', 'A20N', 2], ['HAM', 'BCS3', 2], ['DUS', 'BCS3', 2], ['BCN', 'A20N', 2], ['FCO', 'A20N', 2], ['LIS', 'A20N', 1], ['VIE', 'BCS3', 1], ['PMI', 'A20N', 1]], ['A20N', 'BCS3']],
    LUM: ['Lumière Air', 'lcc', 'CDG', 80e6, 16, [['BCN', 'A20N', 2], ['FCO', 'A20N', 2], ['LIS', 'A20N', 2], ['PMI', 'A20N', 1], ['HAM', 'A20N', 1], ['MUC', 'A20N', 1], ['VIE', 'A20N', 1], ['BER', 'A20N', 1]]],
    GLF: ['Gulfstar Airways', 'premium', 'DXB', 400e6, 60, [['LHR', 'B77W', 3], ['CDG', 'A359', 2], ['FRA', 'A359', 2], ['BKK', 'B77W', 2], ['SIN', 'A359', 2], ['BOM', 'A21N', 4], ['DEL', 'A21N', 3], ['JFK', 'B77W', 1], ['SYD', 'A359', 1], ['IST', 'A21N', 2], ['CAI', 'A21N', 2], ['RUH', 'A21N', 3], ['HKG', 'A359', 1]], ['A21N', 'A359', 'B77W']],
    ATC: ['Atlantic Crest', 'premium', 'JFK', 350e6, 60, [['LHR', 'B789', 3], ['CDG', 'B789', 1], ['LAX', 'A21N', 4], ['SFO', 'A21N', 3], ['MIA', 'A21N', 3], ['ORD', 'A20N', 4], ['ATL', 'A20N', 3], ['MEX', 'A20N', 2], ['GRU', 'B789', 1], ['FRA', 'B789', 1], ['NRT', 'B789', 1], ['MCO', 'A20N', 3], ['DFW', 'A20N', 2]], ['A20N', 'A21N', 'B789']],
    LIB: ['Liberty Jet', 'lcc', 'ATL', 150e6, 40, [['MCO', 'B38M', 4], ['LGA', 'B38M', 4], ['ORD', 'B38M', 3], ['DEN', 'B38M', 2], ['LAS', 'B38M', 2], ['FLL', 'B38M', 3], ['DFW', 'B38M', 3], ['BOS', 'B38M', 2], ['PHX', 'B38M', 2], ['CUN', 'B38M', 2], ['MIA', 'B38M', 2]], ['B38M']],
    SKR: ['Sakura Wings', 'premium', 'HND', 350e6, 60, [['ICN', 'A21N', 3], ['PVG', 'A339', 2], ['HKG', 'A359', 2], ['SIN', 'B789', 1], ['BKK', 'B789', 1], ['TPE', 'A21N', 3], ['LHR', 'A35K', 1], ['LAX', 'B789', 1], ['JFK', 'A35K', 1], ['KIX', 'A20N', 4], ['PEK', 'A339', 2], ['MNL', 'A21N', 2], ['SFO', 'B789', 1]], ['A20N', 'A21N', 'B789', 'A359']],
    MRD: ['Meridian Pacific', 'premium', 'SIN', 350e6, 60, [['SYD', 'A359', 2], ['MEL', 'A359', 1], ['HKG', 'A339', 3], ['BKK', 'A21N', 4], ['KUL', 'A20N', 5], ['CGK', 'A20N', 5], ['MNL', 'A21N', 3], ['DEL', 'A339', 1], ['BOM', 'A339', 1], ['LHR', 'A35K', 2], ['PVG', 'A339', 2], ['TPE', 'A21N', 2], ['NRT', 'A339', 1], ['SGN', 'A20N', 3]], ['A20N', 'A21N', 'A339', 'A359']],
    DRG: ['Dragon Air Express', 'lcc', 'PVG', 250e6, 50, [['CAN', 'A21N', 4], ['SZX', 'A21N', 4], ['PEK', 'A21N', 5], ['CKG', 'A20N', 3], ['TFU', 'A20N', 3], ['XIY', 'A20N', 3], ['KMG', 'A20N', 2], ['HKG', 'A21N', 3], ['TPE', 'A20N', 2], ['ICN', 'A20N', 3], ['NRT', 'A21N', 2], ['BKK', 'A21N', 2], ['WUH', 'A20N', 2]], ['A20N', 'A21N']],
    AND: ['Andes Sur', 'premium', 'GRU', 150e6, 30, [['SCL', 'A20N', 2], ['LIM', 'A20N', 1], ['BOG', 'A20N', 1], ['MIA', 'A21N', 1], ['MEX', 'B789', 1]], ['A20N', 'A21N', 'B789']],
    IND: ['Indus Air', 'lcc', 'DEL', 150e6, 50, [['BOM', 'A21N', 8], ['BLR', 'A21N', 5], ['HYD', 'A20N', 4], ['DXB', 'A21N', 3], ['SIN', 'A21N', 1], ['BKK', 'A21N', 2]], ['A20N', 'A21N']],
  };
  const AI_COLORS = { AUR: 1, KES: 2, REG: 3, SOL: 4, ALB: 5, LUM: 6, GLF: 7, ATC: 8, LIB: 9, SKR: 10, MRD: 11, DRG: 12, AND: 13, IND: 14 };
  const DIFFICULTY = {
    easy: { label: 'Zugänglich', equity: 30e6, aiSigma: 0.30, events: 0.6 },
    normal: { label: 'Realistisch', equity: 20e6, aiSigma: null, events: 1.0 },
    hard: { label: 'Experte', equity: 12e6, aiSigma: 0.10, events: 1.4 },
  };
  function bootstrapAi(w, id, setup, sigmaOverride) {
    const [name, arch, base, equity, maxFleet, routes, prefs] = setup;
    const al = w.add(new Airline(id, name, base, arch, equity, maxFleet, AI_COLORS[id]));
    al.sigma = sigmaOverride; al.prefTypes = prefs || null;
    const cfg = al.cfg;
    for (const [dest, typeId, freq] of routes) {
      al.openRoute(-180, base, dest, typeId, freq, aiRulePrice(base, dest, cfg, []), aiRulePrice(dest, base, cfg, []), cfg.service, cfg.buffer, cfg.target_lf, true, false);
      let guard = 0;
      while (!al.plan(0).ok && guard++ < 20) {
        const ac = al.acquire(-1, typeId, base, 'lease');
        ac.delivery_day = -1; ac.lease_start = -400; ac.bornDay = -1;
        ac.age0 = 2 + (al.acCounter * 3.7) % 10; ac.fh = (al.acCounter * 1373) % (P.CCHECK_FH - 200); ac.lastC = 0;
      }
    }
    al.events = [];
    return al;
  }
  function newWorld({ difficulty = 'normal', seed = (Date.now() >>> 0) } = {}) {
    const w = new World(seed);
    const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    w.eventMult = diff.events; w.difficulty = difficulty;
    for (const [id, setup] of Object.entries(AI_SETUP)) bootstrapAi(w, id, setup, diff.aiSigma);
    w.initSlots();
    w.refreshOffers();
    return w;
  }
  const HUMAN_IDS = ['P1', 'P2', 'P3', 'P4'];
  /** Menschliche Airline hinzufügen (Einzelspieler: PLY; Mehrspieler: P1–P4). */
  function addHuman(w, { id = null, name = 'Hanse Air', code = 'HX', base = 'HAM', difficulty = null, owner = null } = {}) {
    if (!P.AIRPORTS[base]) throw new Error('Unbekannter Flughafen');
    const diff = DIFFICULTY[difficulty || w.difficulty] || DIFFICULTY.normal;
    id = id || HUMAN_IDS.find((x) => !w.airlines[x]);
    const humans = w.humans.length;
    const al = w.add(new Airline(id, name, base, null, diff.equity, 99, humans + 1));
    al.code = code; al.difficulty = difficulty || w.difficulty || 'normal'; al.owner = owner; al.joinedDay = w.day;
    al.station(base);
    al.log(w.day, `${name} gegründet in ${ap(base).name}, Startkapital ${(diff.equity / 1e6).toFixed(0)} Mio. EUR`, 'info');
    if (humans > 0 || w.day > 0) w.pushNews(w.day, `Neue Airline am Markt: ${name} mit Basis ${ap(base).name}`, 'info', id);
    return al;
  }
  function newGame({ name = 'Hanse Air', code = 'HX', base = 'HAM', difficulty = 'normal', seed = (Date.now() >>> 0) } = {}) {
    const w = newWorld({ difficulty, seed });
    addHuman(w, { id: 'PLY', name, code, base, difficulty });
    w.playerId = 'PLY';
    return w;
  }

  // ===========================================================================
  // Spieleraktionen: Prüfung und Ausführung an einer Stelle (lokal und auf dem Server)
  // ===========================================================================
  function acquireCost(al, typeId, mode, offer = null, eurusd = P.EURUSD) {
    const t = P.AIRCRAFT_TYPES[typeId], intro = al.familyKnown(typeId) ? 0 : P.TYPE_INTRO_COST;
    if (mode === 'buy') return (offer ? offer.price : t.value_eur) * P.PURCHASE_DOWNPAYMENT + intro;
    if (mode === 'factory') return t.value_eur * 1.08 * P.PURCHASE_DOWNPAYMENT + intro;
    if (mode === 'flex') return intro;
    return P.LEASE_DEPOSIT_MONTHS * (offer ? offer.lease_month : t.lease_month) * (P.EURUSD / eurusd) + intro;
  }
  function staffPlanOf(al) {
    const need = al.staffNeedPlanned(), st = al.staff;
    const pipe = (role, g) => st.pipeline.filter((p) => (p.kind === 'hire' && p.role === role && (role !== 'pilot' || p.group === g)) || (p.kind === 'train' && role === 'pilot' && p.to === g)).reduce((s, p) => s + p.count, 0);
    const rows = STAFF_GROUPS.map((g) => ({ key: g, role: 'pilot', group: g, label: roleLabel('pilot', g), have: st.pil[g], need: need.pil[g], pipe: pipe('pilot', g), salary: P.STAFF.pilotSalary[g] }))
      .filter((r) => r.have || r.need || r.pipe || al.fleet.some((a) => P.AIRCRAFT_TYPES[a.type_id].group === r.group));
    rows.push({ key: 'cab', role: 'cabin', group: null, label: 'Flugbegleiter', have: st.cab, need: need.cab, pipe: pipe('cabin'), salary: P.STAFF.cabinSalary });
    rows.push({ key: 'tech', role: 'tech', group: null, label: 'Techniker', have: st.tech, need: need.tech, pipe: pipe('tech'), salary: P.STAFF.techSalary });
    return rows;
  }
  const num = (x, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
  function applyAction(w, alId, a) {
    const al = w.airlines[alId];
    if (!al || !al.isPlayer) return { ok: false, msg: 'Airline nicht gefunden.' };
    if (al.status === 'insolvent') return { ok: false, msg: 'Die Airline ist insolvent.' };
    if (!a || typeof a.type !== 'string') return { ok: false, msg: 'Unbekannte Aktion.' };
    const day = w.day, cash = al.ledger.cash / 100, cpiV = w.macro.cpi;
    const route = (id) => al.routes.find((r) => r.id === id && !r.closed);
    const ac = (id) => al.fleet.find((x) => x.id === id);
    switch (a.type) {
      case 'openRoute': {
        const { base, dest } = a, type = a.typeId, freq = clamp(Math.round(num(a.freq, 1)), 1, 8);
        if (!al.bases.includes(base) || !P.AIRPORTS[dest] || !P.AIRCRAFT_TYPES[type] || base === dest) return { ok: false, msg: 'Ungültige Strecke.' };
        if (!routeKmOk(base, dest)) return { ok: false, msg: 'Unter 300 km lohnt kein Flug.' };
        if (!rangeOk(base, dest, type)) return { ok: false, msg: 'Reichweite zu kurz.' };
        if (al.activeRoutes().some((r) => pairKey(r.base, r.dest) === pairKey(base, dest))) return { ok: false, msg: `${base}–${dest} fliegen Sie schon. Ändern Sie die Frequenz in der Streckenliste.` };
        if (!w.slotsOk(base, dest, freq)) return { ok: false, msg: 'Dafür gibt es keine freien Slots.' };
        const service = P.SERVICE[a.service] ? a.service : 'standard', buffer = P.BUFFER_POLICY[a.buffer] ? a.buffer : 'normal';
        const fo = clamp(num(a.fo, refPrice(base, dest, cpiV)), 10, 5000), fi = clamp(num(a.fi, refPrice(dest, base, cpiV)), 10, 5000);
        if (!al.stations[dest] && P.TERMINALS[a.term]) al.station(dest).terminal = a.term;
        const rot = rotationHours(base, dest, type, service, buffer, al.turnExtra(base), al.turnExtra(dest));
        const { used } = al.plan(day, null, 0), wnd = winOf(type);
        const now = al.fleet.some((x) => x.type_id === type && x.base === base && al.available(x, day, 0) && (rot > wnd ? (used[x.id] || 0) === 0 : wnd - (used[x.id] || 0) >= rot));
        const soon = al.fleet.filter((x) => x.type_id === type && x.base === base && x.delivery_day > day).map((x) => x.delivery_day).sort((x, y) => x - y);
        const start = now ? day + 1 : (soon.length ? soon[0] : day + 1);
        const r = al.openRoute(start, base, dest, type, freq, fo, fi, service, buffer, clamp(num(a.target, 0.85), 0.5, 1), a.auto !== false);
        if (w.humans.length > 1) w.pushNews(day, `${al.name} kündigt ${ap(base).name}–${ap(dest).name} an: ${freq}x täglich, ab ${Math.round(Math.min(fo, fi))} EUR`, 'ai', al.id);
        w.operableFreq(al);
        return { ok: true, id: r.id, start };
      }
      case 'editRoute': {
        const r = route(a.id); if (!r) return { ok: false, msg: 'Strecke nicht gefunden.' };
        const out = { ok: true };
        const fo = num(a.fo, r.fare_out), fi = num(a.fi, r.fare_in);
        if (fo > 0 && fi > 0 && (Math.round(fo) !== Math.round(r.fare_out) || Math.round(fi) !== Math.round(r.fare_in))) r.setFares(day, clamp(fo, 10, 5000), clamp(fi, 10, 5000));
        const nf = clamp(Math.round(num(a.freq, r.freq)), 1, 8), ns = P.SERVICE[a.service] ? a.service : r.service, nb = P.BUFFER_POLICY[a.buffer] ? a.buffer : r.buffer;
        if (nf > r.freq && !w.slotsOk(r.base, r.dest, nf - r.freq)) out.msg = `Keine freien Slots für ${nf - r.freq} weitere Flüge. Frequenz bleibt bei ${r.freq}.`;
        else if (nf !== r.freq || ns !== r.service || nb !== r.buffer) {
          const old = [r.freq, r.service, r.buffer];
          r.freq = nf; r.service = ns; r.buffer = nb;
          const { unplaced } = al.plan(day, null, P.LEASE_DELIVERY_DAYS);
          if (unplaced[r.id]) out.msg = `Nicht genug Flugzeugzeit: ${unplaced[r.id]} Umlauf/Umläufe fliegen erst mit einem weiteren Flugzeug vom Typ ${P.AIRCRAFT_TYPES[r.type_id].label}.`;
          al.log(day, `${r.base}–${r.dest}: ${old[0]}x ${P.SERVICE[old[1]].label} ${P.BUFFER_POLICY[old[2]].label} → ${nf}x ${P.SERVICE[ns].label} ${P.BUFFER_POLICY[nb].label}`, 'route');
        }
        if (typeof a.auto === 'boolean') r.autoPrice = a.auto;
        if (a.target !== undefined) r.targetLf = clamp(num(a.target, r.targetLf), 0.5, 1);
        w.operableFreq(al);
        return out;
      }
      case 'closeRoute': { const r = route(a.id); if (!r) return { ok: false, msg: 'Strecke nicht gefunden.' }; al.closeRoute(day, r, 'von Ihnen eingestellt'); w.operableFreq(al); return { ok: true }; }
      case 'acquire': {
        const offer = a.offerId ? w.acMarket.find((o) => o.id === a.offerId) : null;
        if (a.offerId && !offer) return { ok: false, msg: 'Das Angebot ist nicht mehr verfügbar.' };
        const type = offer ? offer.type : a.typeId, mode = offer ? (offer.kind === 'lease' ? 'lease' : 'buy') : a.mode;
        if (!P.AIRCRAFT_TYPES[type] || !['lease', 'flex', 'buy', 'factory'].includes(mode)) return { ok: false, msg: 'Ungültiges Flugzeug.' };
        const base = al.bases.includes(a.base) ? a.base : al.bases[0];
        if (cash < acquireCost(al, type, mode, offer, w.macro.eurusd)) return { ok: false, msg: 'Dafür reicht der Kontostand nicht.' };
        const x = offer ? w.takeMarketAircraft(al, offer.id, mode, base).ac : al.acquire(day, type, base, mode, null, w);
        return { ok: true, acId: x.id, delivery: x.delivery_day, base };
      }
      case 'dispose': { const x = ac(a.acId); if (!x) return { ok: false, msg: 'Flugzeug nicht gefunden.' }; al.dispose(day, x, 'von Ihnen'); w.operableFreq(al); return { ok: true }; }
      case 'acmi': return w.acceptAcmi(al, a.offerId, a.acId);
      case 'move': { const r = w.moveAircraft(al, a.acId, a.base); if (r.ok) w.operableFreq(al); return r; }
      case 'hire': return w.hire(al, a.role, a.group || null, Math.floor(num(a.count)));
      case 'fire': return w.fire(al, a.role, a.group || null, Math.floor(num(a.count)));
      case 'fillStaff': {
        let n = 0; const msgs = [];
        for (const r of staffPlanOf(al)) {
          const want = Math.ceil(r.need * (r.role === 'tech' ? 1 : 1.1) - r.have - r.pipe);
          if (want <= 0) continue;
          const k = Math.min(want, P.STAFF.maxHire[r.role]), res = w.hire(al, r.role, r.group, k);
          if (res.ok) n += k; else msgs.push(res.msg);
        }
        return { ok: true, n, msg: n ? `${n} Personen eingestellt.${msgs.length ? ' ' + msgs[0] : ''}` : (msgs[0] || 'Der Bedarf ist gedeckt.') };
      }
      case 'train': return w.train(al, a.from, a.to, Math.floor(num(a.count)));
      case 'pay': { const v = clamp(num(a.v, 1), 0.8, 1.3); al.staff.pay = v; al.log(day, `Gehaltsniveau auf ${v === 1 ? 'Marktniveau' : Math.round((v - 1) * 100) + ' % gegenüber Markt'} gesetzt`, 'staff'); return { ok: true }; }
      case 'agency': al.staff.agency = !!a.on; return { ok: true };
      case 'hireExpert': return w.hireExpert(al, a.cid);
      case 'fireExpert': return w.fireExpert(al, a.id);
      case 'terminal': { if (!P.TERMINALS[a.v] || !P.AIRPORTS[a.apt]) return { ok: false, msg: 'Ungültig.' }; al.station(a.apt).terminal = a.v; al.log(day, `${a.apt}: ${P.TERMINALS[a.v].label} gebucht`, 'info'); const pr = al.plan(day); w.operableFreq(al); return { ok: true, msg: pr.ok ? null : 'Achtung: Mit der längeren Bodenzeit passen nicht mehr alle Umläufe auf die Flotte.' }; }
      case 'handling': { if (!['own', 'contract'].includes(a.v) || !P.AIRPORTS[a.apt]) return { ok: false, msg: 'Ungültig.' }; al.station(a.apt).handling = a.v; al.log(day, `${a.apt}: Abfertigung ${a.v === 'own' ? 'mit eigenem Team' : 'über Dienstleister'}`, 'info'); return { ok: true }; }
      case 'hangar': {
        if (!al.bases.includes(a.apt)) return { ok: false, msg: 'Hangars gibt es nur an Basen.' };
        if (al.hangars.includes(a.apt)) { al.hangars = al.hangars.filter((x) => x !== a.apt); al.log(day, `Hangar in ${a.apt} gekündigt`, 'info'); }
        else { al.hangars.push(a.apt); al.log(day, `Hangar in ${a.apt} gemietet`, 'info'); }
        return { ok: true };
      }
      case 'openBase': { if (!P.AIRPORTS[a.apt]) return { ok: false, msg: 'Ungültig.' }; const r = w.openBase(al, a.apt); if (r.ok && w.humans.length > 1) w.pushNews(day, `${al.name} eröffnet eine Basis in ${ap(a.apt).name}`, 'ai', al.id); return r; }
      case 'hedge': { const share = clamp(num(a.share), 0, P.FUEL_HEDGE.maxShare), months = [3, 6, 12].includes(num(a.months)) ? num(a.months) : 6; return w.setHedge(al, share, months); }
      case 'unhedge': return w.setHedge(al, 0, 0);
      case 'insurance': if (!P.INSURANCE[a.v]) return { ok: false, msg: 'Ungültig.' }; al.insurance = a.v; al.log(day, `Versicherung: ${P.INSURANCE[a.v].label}`, 'info'); return { ok: true };
      case 'marketing': al.marketing = clamp(Math.round(num(a.v)), 0, 1e6); return { ok: true };
      case 'cargo': al.cargo = !!a.on; al.log(day, al.cargo ? 'Frachtagent beauftragt: Beiladefracht wird vermarktet' : 'Frachtvermarktung beendet', 'info'); return { ok: true };
      case 'study': if (!P.AIRPORTS[a.a] || !P.AIRPORTS[a.b]) return { ok: false, msg: 'Ungültig.' }; return w.commissionStudy(al, a.a, a.b);
      case 'loan': { const years = [3, 5, 8].includes(num(a.years)) ? num(a.years) : 5; return w.takeLoan(al, clamp(num(a.amount), 0, 50e6), years); }
      case 'repay': return w.repayLoan(al, a.id);
      case 'decide': if (!['raise5', 'bonus', 'reject'].includes(a.choice)) return { ok: false, msg: 'Ungültig.' }; w.resolveDecision(al, a.id, a.choice); return { ok: true };
      default: return { ok: false, msg: 'Unbekannte Aktion.' };
    }
  }
  function balanceSheet(al) {
    const cash = al.ledger.cash / 100;
    const nbv = al.fleet.filter((a) => a.owned).reduce((s, a) => s + a.nbv, 0);
    const deposits = al.fleet.reduce((s, a) => s + a.deposit, 0);
    const loansAc = al.fleet.filter((a) => a.owned).reduce((s, a) => s + a.loan, 0);
    const bank = al.loans.reduce((s, l) => s + l.balance, 0);
    const assets = cash + nbv + deposits, liabilities = loansAc + bank + al.creditUsed;
    const leaseLiab = al.fleet.filter((a) => !a.owned && !a.flex).reduce((s, a) => s + (a.leaseMonth || 0) * 24, 0);
    return { cash, nbv, deposits, assets, loans: loansAc, bank, credit: al.creditUsed, liabilities, equity: assets - liabilities, leaseLiab,
      check: assets - liabilities - (al.ledger.equityContrib / 100 + al.ledger.netIncome()) };
  }

  // ===========================================================================
  // Spielstand (kompakt)
  // ===========================================================================
  const HIST_KEYS = ['flights', 'seats', 'cancelled', 'cost', 'block_h', 'pax', 'rev', 'pax_out', 'pax_in', 'seats_out', 'seats_in', 'late', 'demand_out', 'demand_in', 'spill_out', 'spill_in', 'tr_out', 'tr_in', 'cargo'];
  const AI_HIST_KEYS = ['seats', 'pax', 'rev', 'cost', 'pax_out', 'pax_in', 'seats_out', 'seats_in'];
  const r1 = (x) => Math.round(x * 10) / 10;
  function serialize(w, opt = {}) {
    const aiH = opt.compact ? -8 : -30, plH = opt.compact ? -30 : -60;
    return {
      v: 4, param: P.VERSION, day: w.day, difficulty: w.difficulty, rng: w.rng.s, macro: w.macro, fuelHist: w.fuelHist.slice(-370),
      playerId: w.playerId, order: w.order, news: w.news.slice(-120), events: w.events.filter((e) => e.end + (e.recovery || 0) > w.day - 30), eventCounter: w.eventCounter,
      seed: w.seed, slotCap: w.slotCap, eventMult: w.eventMult,
      candidates: w.candidates, acMarket: w.acMarket, acmiOffers: w.acmiOffers, offerCounter: w.offerCounter,
      airlines: w.list.map((al) => ({
        id: al.id, name: al.name, archetype: al.archetype, color: al.color, code: al.code, difficulty: al.difficulty, sigma: al.sigma, owner: al.owner || null, joinedDay: al.joinedDay || 0, prefTypes: al.prefTypes || null,
        bases: al.bases, fleet: al.fleet.map((a) => { const { assigned, ...rest } = a; return rest; }),
        routes: al.routes.filter((r) => !r.closed || (al.isPlayer && (w.day - (r.closedDay ?? w.day)) < 60)).map((r) => ({
          id: r.id, airline: r.airline, base: r.base, dest: r.dest, type_id: r.type_id, freq: r.freq, fare_out: r.fare_out, fare_in: r.fare_in,
          service: r.service, buffer: r.buffer, opened_day: r.opened_day, pending: r.pending, autoPrice: r.autoPrice, targetLf: r.targetLf,
          closed: r.closed, closedDay: r.closedDay, reviewNeg: r.reviewNeg, lastChange: r.lastChange, hk: al.isPlayer ? 0 : 1,
          hist: (al.isPlayer ? r.hist.slice(plH) : r.hist.slice(aiH)).map((h) => (al.isPlayer ? HIST_KEYS : AI_HIST_KEYS).map((k) => (k === 'block_h' ? r1(h[k] || 0) : Math.round(h[k] || 0)))),
        })),
        typesIntroduced: al.typesIntroduced, creditUsed: al.creditUsed, lossCarry: al.lossCarry, monthPnlStart: al.monthPnlStart,
        distressDays: al.distressDays, status: al.status, events: al.events.slice(al.isPlayer ? -150 : -10), otpHist: al.otpHist,
        maxFleet: al.maxFleet, warnLevel: al.warnLevel, acCounter: al.acCounter, routeCounter: al.routeCounter, rngF: al.rngForecast.s,
        brand: al.brand, marketing: al.marketing, cargo: al.cargo, loans: al.loans, rating: al.rating, insurance: al.insurance, hedge: al.hedge,
        experts: al.experts, studies: al.studies, stations: al.stations, hangars: al.hangars, decisions: al.decisions.slice(-20), milestones: al.milestones,
        staff: al.staff ? { ...al.staff, cov: null } : null, runway: isFinite(al.runway) ? al.runway : null,
        ledger: { pnl: al.ledger.pnl, cash: al.ledger.cash, equityContrib: al.ledger.equityContrib, month: al.ledger.month,
          months: al.ledger.months.slice(al.isPlayer ? -24 : -6), cashHist: al.ledger.cashHist.slice(al.isPlayer ? -400 : -30).map((x) => Math.round(x)) },
      })),
    };
  }
  function deserialize(s) {
    if (s.v !== 4) throw new Error('Spielstand aus einer älteren Version');
    const w = new World(1);
    Object.assign(w, { difficulty: s.difficulty || 'normal', day: s.day, macro: s.macro, fuelHist: s.fuelHist || [], playerId: s.playerId, news: s.news || [], events: s.events || [], eventCounter: s.eventCounter || 0,
      seed: s.seed, slotCap: s.slotCap || {}, eventMult: s.eventMult || 1, candidates: s.candidates || [], acMarket: s.acMarket || [], acmiOffers: s.acmiOffers || [], offerCounter: s.offerCounter || 0 });
    w.rng.s = s.rng;
    for (const a of s.airlines) {
      const al = new Airline(a.id, a.name, a.bases[0], a.archetype, 0, a.maxFleet, a.color);
      const { ledger, rngF, routes, runway, ...rest } = a;
      Object.assign(al, rest);
      al.runway = runway === null ? Infinity : runway;
      al.rngForecast.s = rngF;
      Object.assign(al.ledger, ledger);
      al.routes = routes.map((r) => {
        const keys = r.hk ? AI_HIST_KEYS : HIST_KEYS;
        const { hist, hk, ...rr } = r;
        const rt = new Route({ ...rr, hist: [] });
        rt.hist = hist.map((arr) => { const o = Object.fromEntries(HIST_KEYS.map((k) => [k, 0])); keys.forEach((k, i) => { o[k] = arr[i]; }); return o; });
        return rt;
      });
      w.add(al);
    }
    w.order = s.order;
    return w;
  }

  return {
    P, AP_CODES, MONTH_STARTS, COUNTRIES, COUNTRY_NAMES, STAFF_GROUPS, EVENT_TYPES, Rng, ap, apx, gcDistanceKm, blockHours, refPrice, railShare, railTime, accessibility,
    qBase, qPot, seasonFactor, offer, withIndirect, choiceProbs, allocate, legCosts, sumCosts, aircraftDayFixedGeneric, rotationHours, turnHours, rangeOk,
    evaluateRoute, monthOf, Ledger, Route, Airline, World, routeDb, routeLf, priceFloor, aiRulePrice, destFits, newGame, newWorld, addHuman, applyAction, acquireCost, staffPlanOf, balanceSheet, serialize, deserialize,
    PNL_ACCOUNTS, COST_KEYS, DIFFICULTY, AI_SETUP, COUNTRY_LABEL, COUNTRY_DATA, REGION_ORDER, winOf, acShareOf, pilotsFor, routeKmOk, sumObj, INDIRECT_ID, pairKey, roleLabel, cargoDemand, cargoYield, clamp, lv3,
  };
})();
if (typeof module !== 'undefined') module.exports = SM;
