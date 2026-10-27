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
  const AIRPORT_DATA = {"ATL":{"name":"Atlanta","lat":33.64,"lon":-84.43,"pop":6.3,"income":1.35,"biz":1.2,"tour":1.0,"land":5.2,"paxfee":18,"tax":18,"taxi":0.2,"country":"US","rank":1,"pax":106.0,"region":"Nordamerika"},"DXB":{"name":"Dubai","lat":25.25,"lon":55.36,"pop":3.6,"income":1.2,"biz":1.3,"tour":2.0,"land":6.4,"paxfee":26,"tax":10,"taxi":0.19,"country":"AE","rank":2,"pax":95.0,"region":"Nahost"},"HND":{"name":"Tokio-Haneda","lat":35.55,"lon":139.78,"pop":25.0,"income":0.95,"biz":1.6,"tour":1.3,"land":11.3,"paxfee":28,"tax":7,"taxi":0.18,"country":"JP","rank":3,"pax":92.0,"region":"Asien"},"DFW":{"name":"Dallas","lat":32.9,"lon":-97.04,"pop":8.0,"income":1.35,"biz":1.3,"tour":0.8,"land":4.9,"paxfee":17,"tax":18,"taxi":0.16,"country":"US","rank":4,"pax":86.0,"region":"Nordamerika"},"PVG":{"name":"Shanghai-Pudong","lat":31.14,"lon":121.81,"pop":15.0,"income":0.45,"biz":1.4,"tour":1.2,"land":6.1,"paxfee":15,"tax":6,"taxi":0.16,"country":"CN","rank":5,"pax":85.0,"region":"Asien"},"ORD":{"name":"Chicago","lat":41.98,"lon":-87.9,"pop":9.5,"income":1.35,"biz":1.5,"tour":1.1,"land":4.9,"paxfee":17,"tax":18,"taxi":0.16,"country":"US","rank":6,"pax":85.0,"region":"Nordamerika"},"LHR":{"name":"London-Heathrow","lat":51.47,"lon":-0.45,"pop":14.0,"income":1.15,"biz":1.8,"tour":1.6,"land":12,"paxfee":52,"tax":15,"taxi":0.15,"country":"GB","rank":7,"pax":84.0,"region":"Europa"},"IST":{"name":"Istanbul","lat":41.26,"lon":28.74,"pop":12.0,"income":0.45,"biz":1.2,"tour":1.8,"land":4.9,"paxfee":18,"tax":5,"taxi":0.15,"country":"TR","rank":8,"pax":84.0,"region":"Europa"},"CAN":{"name":"Guangzhou","lat":23.39,"lon":113.3,"pop":19.0,"income":0.45,"biz":1.2,"tour":0.9,"land":6.1,"paxfee":15,"tax":6,"taxi":0.15,"country":"CN","rank":9,"pax":84.0,"region":"Asien"},"DEN":{"name":"Denver","lat":39.86,"lon":-104.67,"pop":3.5,"income":1.35,"biz":1.0,"tour":1.2,"land":4.8,"paxfee":17,"tax":18,"taxi":0.15,"country":"US","rank":10,"pax":82.0,"region":"Nordamerika"},"DEL":{"name":"Delhi","lat":28.56,"lon":77.1,"pop":30.0,"income":0.18,"biz":1.0,"tour":1.2,"land":4.8,"paxfee":10,"tax":4,"taxi":0.14,"country":"IN","rank":11,"pax":78.0,"region":"Asien"},"ICN":{"name":"Seoul-Incheon","lat":37.46,"lon":126.44,"pop":22.0,"income":0.9,"biz":1.3,"tour":1.3,"land":7.0,"paxfee":18,"tax":7,"taxi":0.13,"country":"KR","rank":12,"pax":74.0,"region":"Asien"},"LAX":{"name":"Los Angeles","lat":33.94,"lon":-118.41,"pop":13.0,"income":1.35,"biz":1.3,"tour":1.5,"land":4.7,"paxfee":16,"tax":18,"taxi":0.13,"country":"US","rank":13,"pax":74.0,"region":"Nordamerika"},"CDG":{"name":"Paris-CDG","lat":49.01,"lon":2.55,"pop":12.0,"income":1.1,"biz":1.6,"tour":1.7,"land":9,"paxfee":24,"tax":7,"taxi":0.15,"country":"FR","rank":14,"pax":72.0,"region":"Europa"},"PEK":{"name":"Peking-Capital","lat":40.08,"lon":116.58,"pop":14.0,"income":0.45,"biz":1.4,"tour":1.2,"land":5.8,"paxfee":14,"tax":6,"taxi":0.12,"country":"CN","rank":15,"pax":71.0,"region":"Asien"},"SIN":{"name":"Singapur","lat":1.36,"lon":103.99,"pop":6.0,"income":1.4,"biz":1.6,"tour":1.5,"land":8.0,"paxfee":34,"tax":8,"taxi":0.11,"country":"SG","rank":16,"pax":70.0,"region":"Asien"},"AMS":{"name":"Amsterdam","lat":52.31,"lon":4.77,"pop":4.0,"income":1.15,"biz":1.3,"tour":1.3,"land":8,"paxfee":33,"tax":29,"taxi":0.1,"country":"NL","rank":17,"pax":69.0,"region":"Europa"},"MAD":{"name":"Madrid","lat":40.47,"lon":-3.57,"pop":7.0,"income":0.85,"biz":1.2,"tour":1.4,"land":5.7,"paxfee":17,"tax":0,"taxi":0.11,"country":"ES","rank":18,"pax":68.0,"region":"Europa"},"SZX":{"name":"Shenzhen","lat":22.64,"lon":113.81,"pop":13.0,"income":0.45,"biz":1.3,"tour":0.6,"land":5.6,"paxfee":14,"tax":6,"taxi":0.1,"country":"CN","rank":19,"pax":66.0,"region":"Asien"},"KUL":{"name":"Kuala Lumpur","lat":2.75,"lon":101.71,"pop":8.0,"income":0.5,"biz":1.1,"tour":1.3,"land":4.5,"paxfee":13,"tax":4,"taxi":0.09,"country":"MY","rank":20,"pax":63.0,"region":"Asien"},"FRA":{"name":"Frankfurt","lat":50.03,"lon":8.57,"pop":5.8,"income":1.15,"biz":1.5,"tour":0.7,"land":9,"paxfee":26,"tax":15,"taxi":0.1,"country":"DE","rank":21,"pax":63.0,"region":"Europa"},"BKK":{"name":"Bangkok","lat":13.69,"lon":100.75,"pop":12.0,"income":0.35,"biz":1.0,"tour":2.2,"land":4.5,"paxfee":17,"tax":4,"taxi":0.09,"country":"TH","rank":22,"pax":63.0,"region":"Asien"},"JFK":{"name":"New York-JFK","lat":40.64,"lon":-73.78,"pop":12.0,"income":1.35,"biz":1.8,"tour":1.6,"land":4.5,"paxfee":16,"tax":18,"taxi":0.09,"country":"US","rank":23,"pax":63.0,"region":"Nordamerika"},"HKG":{"name":"Hongkong","lat":22.31,"lon":113.92,"pop":7.5,"income":1.1,"biz":1.7,"tour":1.6,"land":7.7,"paxfee":17,"tax":15,"taxi":0.09,"country":"HK","rank":24,"pax":61.0,"region":"Asien"},"MCO":{"name":"Orlando","lat":28.43,"lon":-81.31,"pop":2.8,"income":1.35,"biz":0.5,"tour":3.0,"land":4.4,"paxfee":15,"tax":18,"taxi":0.08,"country":"US","rank":25,"pax":58.0,"region":"Nordamerika"},"BCN":{"name":"Barcelona","lat":41.3,"lon":2.08,"pop":5.5,"income":0.85,"biz":1.0,"tour":1.8,"land":5,"paxfee":15,"tax":0,"taxi":0.0,"country":"ES","rank":26,"pax":57.0,"region":"Europa"},"TFU":{"name":"Chengdu-Tianfu","lat":30.31,"lon":104.44,"pop":9.0,"income":0.45,"biz":1.0,"tour":1.1,"land":5.4,"paxfee":13,"tax":6,"taxi":0.08,"country":"CN","rank":27,"pax":57.0,"region":"Asien"},"BOM":{"name":"Mumbai","lat":19.09,"lon":72.87,"pop":22.0,"income":0.18,"biz":1.3,"tour":1.0,"land":4.3,"paxfee":9,"tax":4,"taxi":0.07,"country":"IN","rank":28,"pax":56.0,"region":"Asien"},"MIA":{"name":"Miami","lat":25.8,"lon":-80.29,"pop":6.0,"income":1.35,"biz":1.2,"tour":2.2,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":29,"pax":55.0,"region":"Nordamerika"},"LAS":{"name":"Las Vegas","lat":36.08,"lon":-115.15,"pop":2.3,"income":1.35,"biz":0.6,"tour":3.0,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":30,"pax":55.0,"region":"Nordamerika"},"CGK":{"name":"Jakarta","lat":-6.13,"lon":106.66,"pop":30.0,"income":0.25,"biz":1.0,"tour":0.8,"land":4.3,"paxfee":11,"tax":4,"taxi":0.07,"country":"ID","rank":31,"pax":55.0,"region":"Asien"},"SFO":{"name":"San Francisco","lat":37.62,"lon":-122.38,"pop":7.5,"income":1.35,"biz":1.6,"tour":1.4,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":32,"pax":55.0,"region":"Nordamerika"},"DOH":{"name":"Doha","lat":25.27,"lon":51.61,"pop":2.5,"income":1.4,"biz":1.1,"tour":0.8,"land":5.4,"paxfee":21,"tax":10,"taxi":0.07,"country":"QA","rank":33,"pax":54.0,"region":"Nahost"},"CLT":{"name":"Charlotte","lat":35.21,"lon":-80.94,"pop":2.8,"income":1.35,"biz":1.0,"tour":0.7,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":34,"pax":54.0,"region":"Nordamerika"},"PKX":{"name":"Peking-Daxing","lat":39.51,"lon":116.41,"pop":8.0,"income":0.45,"biz":1.0,"tour":1.0,"land":5.4,"paxfee":13,"tax":6,"taxi":0.07,"country":"CN","rank":35,"pax":54.0,"region":"Asien"},"JED":{"name":"Dschidda","lat":21.68,"lon":39.16,"pop":4.5,"income":0.8,"biz":0.9,"tour":1.2,"land":5.3,"paxfee":19,"tax":12,"taxi":0.07,"country":"SA","rank":36,"pax":53.0,"region":"Nahost"},"SEA":{"name":"Seattle","lat":47.45,"lon":-122.31,"pop":4.2,"income":1.35,"biz":1.3,"tour":1.1,"land":4.3,"paxfee":15,"tax":18,"taxi":0.07,"country":"US","rank":37,"pax":53.0,"region":"Nordamerika"},"MNL":{"name":"Manila","lat":14.51,"lon":121.02,"pop":25.0,"income":0.22,"biz":1.0,"tour":0.9,"land":4.2,"paxfee":13,"tax":4,"taxi":0.06,"country":"PH","rank":38,"pax":52.0,"region":"Asien"},"PHX":{"name":"Phoenix","lat":33.43,"lon":-112.01,"pop":5.0,"income":1.35,"biz":1.0,"tour":1.2,"land":4.2,"paxfee":15,"tax":18,"taxi":0.06,"country":"US","rank":39,"pax":52.0,"region":"Nordamerika"},"FCO":{"name":"Rom","lat":41.8,"lon":12.24,"pop":4.3,"income":0.85,"biz":1.0,"tour":1.7,"land":7,"paxfee":20,"tax":7,"taxi":0.05,"country":"IT","rank":40,"pax":51.0,"region":"Europa"},"HGH":{"name":"Hangzhou","lat":30.23,"lon":120.43,"pop":12.0,"income":0.45,"biz":1.1,"tour":1.2,"land":5.2,"paxfee":13,"tax":6,"taxi":0.06,"country":"CN","rank":41,"pax":50.0,"region":"Asien"},"SHA":{"name":"Shanghai-Hongqiao","lat":31.2,"lon":121.34,"pop":10.0,"income":0.45,"biz":1.3,"tour":0.9,"land":5.2,"paxfee":13,"tax":6,"taxi":0.06,"country":"CN","rank":42,"pax":50.0,"region":"Asien"},"CKG":{"name":"Chongqing","lat":29.72,"lon":106.64,"pop":15.0,"income":0.45,"biz":0.9,"tour":0.9,"land":5.2,"paxfee":13,"tax":6,"taxi":0.06,"country":"CN","rank":43,"pax":50.0,"region":"Asien"},"KMG":{"name":"Kunming","lat":25.1,"lon":102.93,"pop":8.0,"income":0.45,"biz":0.8,"tour":1.3,"land":5.2,"paxfee":13,"tax":6,"taxi":0.06,"country":"CN","rank":44,"pax":50.0,"region":"Asien"},"XIY":{"name":"Xi'an","lat":34.45,"lon":108.75,"pop":13.0,"income":0.45,"biz":0.8,"tour":1.2,"land":5.2,"paxfee":13,"tax":6,"taxi":0.05,"country":"CN","rank":45,"pax":49.0,"region":"Asien"},"SAW":{"name":"Istanbul-Sabiha","lat":40.9,"lon":29.31,"pop":6.0,"income":0.45,"biz":0.8,"tour":1.0,"land":4.2,"paxfee":16,"tax":5,"taxi":0.05,"country":"TR","rank":46,"pax":48.0,"region":"Europa"},"IAH":{"name":"Houston","lat":29.99,"lon":-95.34,"pop":7.0,"income":1.35,"biz":1.3,"tour":0.8,"land":4.2,"paxfee":15,"tax":18,"taxi":0.05,"country":"US","rank":47,"pax":48.0,"region":"Nordamerika"},"TPE":{"name":"Taipeh","lat":25.08,"lon":121.23,"pop":9.0,"income":0.9,"biz":1.2,"tour":1.2,"land":6.2,"paxfee":16,"tax":10,"taxi":0.05,"country":"TW","rank":48,"pax":48.0,"region":"Asien"},"YYZ":{"name":"Toronto","lat":43.68,"lon":-79.63,"pop":7.0,"income":1.15,"biz":1.3,"tour":1.1,"land":6.2,"paxfee":26,"tax":15,"taxi":0.05,"country":"CA","rank":49,"pax":47.0,"region":"Nordamerika"},"GRU":{"name":"São Paulo","lat":-23.43,"lon":-46.47,"pop":22.0,"income":0.5,"biz":1.2,"tour":0.9,"land":5.2,"paxfee":16,"tax":10,"taxi":0.05,"country":"BR","rank":50,"pax":47.0,"region":"Lateinamerika"},"EWR":{"name":"New York-Newark","lat":40.69,"lon":-74.17,"pop":7.0,"income":1.35,"biz":1.3,"tour":1.0,"land":4.2,"paxfee":15,"tax":18,"taxi":0.05,"country":"US","rank":51,"pax":49.0,"region":"Nordamerika"},"MEX":{"name":"Mexiko-Stadt","lat":19.44,"lon":-99.07,"pop":22.0,"income":0.52,"biz":1.1,"tour":1.2,"land":5.1,"paxfee":26,"tax":15,"taxi":0.04,"country":"MX","rank":52,"pax":45.0,"region":"Lateinamerika"},"BOG":{"name":"Bogotá","lat":4.7,"lon":-74.15,"pop":11.0,"income":0.42,"biz":1.0,"tour":0.9,"land":4.1,"paxfee":18,"tax":15,"taxi":0.04,"country":"CO","rank":53,"pax":45.0,"region":"Lateinamerika"},"BOS":{"name":"Boston","lat":42.36,"lon":-71.01,"pop":5.0,"income":1.35,"biz":1.5,"tour":1.2,"land":4.1,"paxfee":14,"tax":18,"taxi":0.04,"country":"US","rank":54,"pax":43.0,"region":"Nordamerika"},"LGW":{"name":"London-Gatwick","lat":51.15,"lon":-0.19,"pop":6.0,"income":1.15,"biz":0.9,"tour":1.8,"land":9.1,"paxfee":30,"tax":15,"taxi":0.04,"country":"GB","rank":55,"pax":43.0,"region":"Europa"},"MUC":{"name":"München","lat":48.35,"lon":11.79,"pop":4.6,"income":1.2,"biz":1.3,"tour":1.0,"land":8,"paxfee":25,"tax":15,"taxi":0.05,"country":"DE","rank":56,"pax":42.0,"region":"Europa"},"BLR":{"name":"Bengaluru","lat":13.2,"lon":77.71,"pop":13.0,"income":0.18,"biz":1.2,"tour":0.8,"land":4.0,"paxfee":8,"tax":4,"taxi":0.03,"country":"IN","rank":57,"pax":41.0,"region":"Asien"},"SVO":{"name":"Moskau","lat":55.97,"lon":37.41,"pop":12.0,"income":0.45,"biz":1.1,"tour":1.0,"land":5.0,"paxfee":12,"tax":0,"taxi":0.03,"country":"RU","rank":58,"pax":40.0,"region":"Europa"},"SYD":{"name":"Sydney","lat":-33.94,"lon":151.18,"pop":5.5,"income":1.25,"biz":1.3,"tour":1.6,"land":8.0,"paxfee":25,"tax":10,"taxi":0.03,"country":"AU","rank":59,"pax":41.0,"region":"Ozeanien"},"SGN":{"name":"Ho-Chi-Minh-Stadt","lat":10.82,"lon":106.66,"pop":12.0,"income":0.25,"biz":0.9,"tour":1.1,"land":4.0,"paxfee":12,"tax":4,"taxi":0.03,"country":"VN","rank":60,"pax":41.0,"region":"Asien"},"NRT":{"name":"Tokio-Narita","lat":35.77,"lon":140.39,"pop":12.0,"income":0.95,"biz":1.0,"tour":1.4,"land":8.9,"paxfee":22,"tax":7,"taxi":0.02,"country":"JP","rank":61,"pax":38.0,"region":"Asien"},"AYT":{"name":"Antalya","lat":36.9,"lon":30.8,"pop":2.7,"income":0.45,"biz":0.2,"tour":3.5,"land":4.0,"paxfee":15,"tax":5,"taxi":0.02,"country":"TR","rank":62,"pax":38.0,"region":"Europa"},"RUH":{"name":"Riad","lat":24.96,"lon":46.7,"pop":7.5,"income":0.8,"biz":1.1,"tour":0.6,"land":4.9,"paxfee":18,"tax":12,"taxi":0.02,"country":"SA","rank":63,"pax":37.0,"region":"Nahost"},"MSP":{"name":"Minneapolis","lat":44.88,"lon":-93.22,"pop":3.7,"income":1.35,"biz":1.1,"tour":0.7,"land":3.9,"paxfee":14,"tax":18,"taxi":0.02,"country":"US","rank":64,"pax":37.0,"region":"Nordamerika"},"MEL":{"name":"Melbourne","lat":-37.67,"lon":144.84,"pop":5.2,"income":1.25,"biz":1.1,"tour":1.2,"land":7.9,"paxfee":25,"tax":10,"taxi":0.02,"country":"AU","rank":65,"pax":37.0,"region":"Ozeanien"},"FLL":{"name":"Fort Lauderdale","lat":26.07,"lon":-80.15,"pop":4.0,"income":1.35,"biz":0.7,"tour":1.8,"land":3.9,"paxfee":14,"tax":18,"taxi":0.01,"country":"US","rank":66,"pax":35.0,"region":"Nordamerika"},"LIS":{"name":"Lissabon","lat":38.77,"lon":-9.13,"pop":2.9,"income":0.75,"biz":0.8,"tour":1.6,"land":6,"paxfee":18,"tax":0,"taxi":0.0,"country":"PT","rank":67,"pax":35.0,"region":"Europa"},"LGA":{"name":"New York-LaGuardia","lat":40.78,"lon":-73.87,"pop":7.0,"income":1.35,"biz":1.5,"tour":1.0,"land":3.9,"paxfee":14,"tax":18,"taxi":0.01,"country":"US","rank":68,"pax":33.0,"region":"Nordamerika"},"PMI":{"name":"Palma","lat":39.55,"lon":2.74,"pop":0.9,"income":0.85,"biz":0.3,"tour":2.5,"land":5,"paxfee":14,"tax":0,"taxi":0.0,"country":"ES","rank":69,"pax":33.0,"region":"Europa"},"DUB":{"name":"Dublin","lat":53.43,"lon":-6.27,"pop":2.2,"income":1.3,"biz":1.2,"tour":1.3,"land":5.8,"paxfee":19,"tax":0,"taxi":0.01,"country":"IE","rank":70,"pax":33.0,"region":"Europa"},"ORY":{"name":"Paris-Orly","lat":48.72,"lon":2.38,"pop":5.0,"income":1.1,"biz":0.9,"tour":1.4,"land":8.7,"paxfee":23,"tax":7,"taxi":0.01,"country":"FR","rank":71,"pax":33.0,"region":"Europa"},"NKG":{"name":"Nanjing","lat":31.74,"lon":118.86,"pop":9.0,"income":0.45,"biz":1.0,"tour":0.9,"land":4.8,"paxfee":12,"tax":6,"taxi":0.01,"country":"CN","rank":72,"pax":32.0,"region":"Asien"},"CUN":{"name":"Cancún","lat":21.04,"lon":-86.88,"pop":1.0,"income":0.52,"biz":0.2,"tour":3.5,"land":4.8,"paxfee":24,"tax":15,"taxi":0.01,"country":"MX","rank":73,"pax":32.0,"region":"Lateinamerika"},"DTW":{"name":"Detroit","lat":42.21,"lon":-83.35,"pop":4.3,"income":1.35,"biz":1.0,"tour":0.6,"land":3.8,"paxfee":13,"tax":18,"taxi":0.01,"country":"US","rank":74,"pax":32.0,"region":"Nordamerika"},"PHL":{"name":"Philadelphia","lat":39.87,"lon":-75.24,"pop":6.2,"income":1.35,"biz":1.2,"tour":0.9,"land":3.8,"paxfee":13,"tax":18,"taxi":0.01,"country":"US","rank":75,"pax":32.0,"region":"Nordamerika"},"ATH":{"name":"Athen","lat":37.94,"lon":23.94,"pop":3.8,"income":0.6,"biz":0.8,"tour":1.8,"land":5.8,"paxfee":21,"tax":0,"taxi":0.01,"country":"GR","rank":76,"pax":32.0,"region":"Europa"},"KIX":{"name":"Osaka-Kansai","lat":34.43,"lon":135.24,"pop":15.0,"income":0.95,"biz":1.2,"tour":1.5,"land":8.6,"paxfee":21,"tax":7,"taxi":0.0,"country":"JP","rank":77,"pax":31.0,"region":"Asien"},"CTU":{"name":"Chengdu-Shuangliu","lat":30.58,"lon":103.95,"pop":9.0,"income":0.45,"biz":1.1,"tour":1.0,"land":4.8,"paxfee":11,"tax":6,"taxi":0.0,"country":"CN","rank":78,"pax":31.0,"region":"Asien"},"ZRH":{"name":"Zürich","lat":47.46,"lon":8.55,"pop":2.0,"income":1.5,"biz":1.5,"tour":1.3,"land":8.6,"paxfee":29,"tax":0,"taxi":0.0,"country":"CH","rank":79,"pax":31.0,"region":"Europa"},"CSX":{"name":"Changsha","lat":28.19,"lon":113.22,"pop":10.0,"income":0.45,"biz":0.8,"tour":0.9,"land":4.8,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":80,"pax":30.0,"region":"Asien"},"WUH":{"name":"Wuhan","lat":30.78,"lon":114.21,"pop":12.0,"income":0.45,"biz":0.9,"tour":0.8,"land":4.8,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":81,"pax":30.0,"region":"Asien"},"CAI":{"name":"Kairo","lat":30.12,"lon":31.41,"pop":22.0,"income":0.2,"biz":0.9,"tour":1.5,"land":3.8,"paxfee":14,"tax":10,"taxi":0,"country":"EG","rank":82,"pax":30.0,"region":"Afrika"},"CPH":{"name":"Kopenhagen","lat":55.62,"lon":12.66,"pop":2.1,"income":1.3,"biz":1.2,"tour":1.2,"land":6.6,"paxfee":21,"tax":0,"taxi":0,"country":"DK","rank":83,"pax":30.0,"region":"Europa"},"MAN":{"name":"Manchester","lat":53.35,"lon":-2.27,"pop":3.5,"income":1.15,"biz":0.9,"tour":0.9,"land":8.5,"paxfee":28,"tax":15,"taxi":0,"country":"GB","rank":84,"pax":30.0,"region":"Europa"},"AUH":{"name":"Abu Dhabi","lat":24.43,"lon":54.65,"pop":1.5,"income":1.2,"biz":1.1,"tour":1.0,"land":4.7,"paxfee":19,"tax":10,"taxi":0,"country":"AE","rank":85,"pax":29.0,"region":"Nahost"},"XMN":{"name":"Xiamen","lat":24.54,"lon":118.13,"pop":5.0,"income":0.45,"biz":0.9,"tour":1.2,"land":4.7,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":86,"pax":29.0,"region":"Asien"},"CJU":{"name":"Jeju","lat":33.51,"lon":126.49,"pop":0.7,"income":0.9,"biz":0.2,"tour":2.5,"land":5.7,"paxfee":14,"tax":7,"taxi":0,"country":"KR","rank":87,"pax":29.0,"region":"Asien"},"HAN":{"name":"Hanoi","lat":21.22,"lon":105.81,"pop":8.5,"income":0.25,"biz":1.0,"tour":1.1,"land":3.8,"paxfee":11,"tax":4,"taxi":0,"country":"VN","rank":88,"pax":29.0,"region":"Asien"},"TAO":{"name":"Qingdao","lat":36.36,"lon":120.09,"pop":10.0,"income":0.45,"biz":0.9,"tour":1.1,"land":4.7,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":89,"pax":29.0,"region":"Asien"},"DMK":{"name":"Bangkok-Don Mueang","lat":13.91,"lon":100.61,"pop":5.0,"income":0.35,"biz":0.6,"tour":1.2,"land":3.8,"paxfee":14,"tax":4,"taxi":0,"country":"TH","rank":90,"pax":29.0,"region":"Asien"},"HYD":{"name":"Hyderabad","lat":17.24,"lon":78.43,"pop":10.0,"income":0.18,"biz":1.0,"tour":0.7,"land":3.8,"paxfee":8,"tax":4,"taxi":0,"country":"IN","rank":91,"pax":29.0,"region":"Asien"},"SLC":{"name":"Salt Lake City","lat":40.79,"lon":-111.98,"pop":2.5,"income":1.35,"biz":0.9,"tour":1.0,"land":3.8,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":92,"pax":28.0,"region":"Nordamerika"},"SCL":{"name":"Santiago de Chile","lat":-33.39,"lon":-70.79,"pop":7.0,"income":0.62,"biz":1.0,"tour":0.9,"land":4.7,"paxfee":21,"tax":12,"taxi":0,"country":"CL","rank":93,"pax":27.0,"region":"Lateinamerika"},"YVR":{"name":"Vancouver","lat":49.19,"lon":-123.18,"pop":2.7,"income":1.15,"biz":1.1,"tour":1.3,"land":5.6,"paxfee":23,"tax":15,"taxi":0,"country":"CA","rank":94,"pax":27.0,"region":"Nordamerika"},"BWI":{"name":"Baltimore","lat":39.18,"lon":-76.67,"pop":2.8,"income":1.35,"biz":0.9,"tour":0.8,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":95,"pax":27.0,"region":"Nordamerika"},"IAD":{"name":"Washington-Dulles","lat":38.95,"lon":-77.46,"pop":3.5,"income":1.35,"biz":1.3,"tour":0.9,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":96,"pax":26.0,"region":"Nordamerika"},"DCA":{"name":"Washington-Reagan","lat":38.85,"lon":-77.04,"pop":3.5,"income":1.35,"biz":1.6,"tour":1.0,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":97,"pax":26.0,"region":"Nordamerika"},"LIM":{"name":"Lima","lat":-12.02,"lon":-77.11,"pop":11.0,"income":0.42,"biz":1.0,"tour":1.0,"land":3.7,"paxfee":18,"tax":12,"taxi":0,"country":"PE","rank":98,"pax":25.0,"region":"Lateinamerika"},"SAN":{"name":"San Diego","lat":32.73,"lon":-117.19,"pop":3.3,"income":1.35,"biz":1.0,"tour":1.5,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":99,"pax":25.0,"region":"Nordamerika"},"TPA":{"name":"Tampa","lat":27.98,"lon":-82.53,"pop":3.2,"income":1.35,"biz":0.8,"tour":1.6,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":100,"pax":25.0,"region":"Nordamerika"},"VIE":{"name":"Wien","lat":48.11,"lon":16.57,"pop":3.0,"income":1.05,"biz":1.0,"tour":1.2,"land":8,"paxfee":25,"tax":12,"taxi":0.0,"country":"AT","rank":null,"pax":32.0,"region":"Europa"},"BER":{"name":"Berlin","lat":52.37,"lon":13.5,"pop":6.0,"income":0.95,"biz":1.0,"tour":1.3,"land":6,"paxfee":18,"tax":15,"taxi":0.0,"country":"DE","rank":null,"pax":25.0,"region":"Europa"},"DUS":{"name":"Düsseldorf","lat":51.29,"lon":6.77,"pop":7.0,"income":1.0,"biz":1.1,"tour":0.5,"land":7,"paxfee":19,"tax":15,"taxi":0.0,"country":"DE","rank":null,"pax":20.0,"region":"Europa"},"HAM":{"name":"Hamburg","lat":53.63,"lon":9.99,"pop":3.2,"income":1.1,"biz":1.0,"tour":0.9,"land":7,"paxfee":17,"tax":15,"taxi":0.0,"country":"DE","rank":null,"pax":15.0,"region":"Europa"},"JNB":{"name":"Johannesburg","lat":-26.14,"lon":28.25,"pop":10.0,"income":0.3,"biz":1.2,"tour":1.0,"land":4.5,"paxfee":16,"tax":10,"taxi":0,"country":"ZA","rank":null,"pax":21.0,"region":"Afrika"},"CPT":{"name":"Kapstadt","lat":-33.97,"lon":18.6,"pop":4.7,"income":0.3,"biz":0.9,"tour":2.2,"land":4.3,"paxfee":15,"tax":10,"taxi":0,"country":"ZA","rank":null,"pax":11.0,"region":"Afrika"},"ADD":{"name":"Addis Abeba","lat":8.98,"lon":38.8,"pop":5.5,"income":0.08,"biz":0.9,"tour":0.6,"land":3.5,"paxfee":10,"tax":5,"taxi":0,"country":"ET","rank":null,"pax":13.0,"region":"Afrika"},"NBO":{"name":"Nairobi","lat":-1.32,"lon":36.93,"pop":5.0,"income":0.12,"biz":1.0,"tour":1.3,"land":3.4,"paxfee":13,"tax":8,"taxi":0,"country":"KE","rank":null,"pax":9.0,"region":"Afrika"},"LOS":{"name":"Lagos","lat":6.58,"lon":3.32,"pop":20.0,"income":0.12,"biz":1.1,"tour":0.5,"land":4.2,"paxfee":17,"tax":10,"taxi":0,"country":"NG","rank":null,"pax":8.0,"region":"Afrika"},"ACC":{"name":"Accra","lat":5.61,"lon":-0.17,"pop":5.0,"income":0.14,"biz":0.9,"tour":0.8,"land":4.1,"paxfee":15,"tax":8,"taxi":0,"country":"GH","rank":null,"pax":3.5,"region":"Afrika"},"CMN":{"name":"Casablanca","lat":33.37,"lon":-7.59,"pop":4.3,"income":0.22,"biz":1.0,"tour":1.0,"land":3.4,"paxfee":12,"tax":5,"taxi":0,"country":"MA","rank":null,"pax":10.0,"region":"Afrika"},"RAK":{"name":"Marrakesch","lat":31.61,"lon":-8.04,"pop":1.3,"income":0.22,"biz":0.4,"tour":2.4,"land":3.4,"paxfee":12,"tax":5,"taxi":0,"country":"MA","rank":null,"pax":8.0,"region":"Afrika"},"ALG":{"name":"Algier","lat":36.69,"lon":3.22,"pop":4.0,"income":0.25,"biz":0.8,"tour":0.4,"land":3.4,"paxfee":10,"tax":5,"taxi":0,"country":"DZ","rank":null,"pax":9.0,"region":"Afrika"},"TUN":{"name":"Tunis","lat":36.85,"lon":10.23,"pop":2.7,"income":0.25,"biz":0.8,"tour":1.3,"land":3.3,"paxfee":10,"tax":5,"taxi":0,"country":"TN","rank":null,"pax":5.0,"region":"Afrika"},"DSS":{"name":"Dakar","lat":14.67,"lon":-17.07,"pop":3.5,"income":0.1,"biz":0.8,"tour":0.9,"land":4.1,"paxfee":15,"tax":8,"taxi":0,"country":"SN","rank":null,"pax":3.0,"region":"Afrika"},"DAR":{"name":"Daressalam","lat":-6.88,"lon":39.2,"pop":7.0,"income":0.08,"biz":0.8,"tour":1.0,"land":3.3,"paxfee":11,"tax":8,"taxi":0,"country":"TZ","rank":null,"pax":3.0,"region":"Afrika"},"HRG":{"name":"Hurghada","lat":27.18,"lon":33.8,"pop":0.3,"income":0.2,"biz":0.2,"tour":2.6,"land":3.4,"paxfee":13,"tax":10,"taxi":0,"country":"EG","rank":null,"pax":9.0,"region":"Afrika"},"MRU":{"name":"Mauritius","lat":-20.43,"lon":57.68,"pop":1.3,"income":0.45,"biz":0.6,"tour":2.6,"land":4.9,"paxfee":16,"tax":10,"taxi":0,"country":"MU","rank":null,"pax":4.0,"region":"Afrika"},"BNE":{"name":"Brisbane","lat":-27.38,"lon":153.12,"pop":2.6,"income":1.25,"biz":1.0,"tour":1.4,"land":7.3,"paxfee":23,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":23.0,"region":"Ozeanien"},"PER":{"name":"Perth","lat":-31.94,"lon":115.97,"pop":2.2,"income":1.25,"biz":1.1,"tour":1.1,"land":7.0,"paxfee":22,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":16.0,"region":"Ozeanien"},"ADL":{"name":"Adelaide","lat":-34.95,"lon":138.53,"pop":1.4,"income":1.25,"biz":0.9,"tour":1.0,"land":6.7,"paxfee":21,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":8.5,"region":"Ozeanien"},"OOL":{"name":"Gold Coast","lat":-28.16,"lon":153.5,"pop":0.7,"income":1.25,"biz":0.3,"tour":2.4,"land":6.7,"paxfee":21,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":6.5,"region":"Ozeanien"},"CBR":{"name":"Canberra","lat":-35.31,"lon":149.2,"pop":0.5,"income":1.25,"biz":1.3,"tour":0.6,"land":6.5,"paxfee":20,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":3.0,"region":"Ozeanien"},"CNS":{"name":"Cairns","lat":-16.88,"lon":145.75,"pop":0.25,"income":1.25,"biz":0.3,"tour":2.6,"land":6.6,"paxfee":21,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":5.0,"region":"Ozeanien"},"HBA":{"name":"Hobart","lat":-42.84,"lon":147.51,"pop":0.25,"income":1.25,"biz":0.6,"tour":1.6,"land":6.5,"paxfee":20,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":2.8,"region":"Ozeanien"},"DRW":{"name":"Darwin","lat":-12.41,"lon":130.88,"pop":0.15,"income":1.25,"biz":0.7,"tour":1.2,"land":6.5,"paxfee":20,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":2.0,"region":"Ozeanien"},"TSV":{"name":"Townsville","lat":-19.25,"lon":146.77,"pop":0.2,"income":1.25,"biz":0.6,"tour":0.9,"land":6.5,"paxfee":20,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":1.6,"region":"Ozeanien"},"NTL":{"name":"Newcastle (Australien)","lat":-32.8,"lon":151.83,"pop":0.6,"income":1.25,"biz":0.7,"tour":0.8,"land":6.5,"paxfee":20,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":1.3,"region":"Ozeanien"},"MCY":{"name":"Sunshine Coast","lat":-26.6,"lon":153.09,"pop":0.4,"income":1.25,"biz":0.3,"tour":1.8,"land":6.5,"paxfee":20,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":1.6,"region":"Ozeanien"},"LST":{"name":"Launceston","lat":-41.55,"lon":147.21,"pop":0.12,"income":1.25,"biz":0.4,"tour":1.2,"land":6.5,"paxfee":20,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":1.3,"region":"Ozeanien"},"ASP":{"name":"Alice Springs","lat":-23.81,"lon":133.9,"pop":0.03,"income":1.25,"biz":0.3,"tour":1.8,"land":6.4,"paxfee":20,"tax":10,"taxi":0,"country":"AU","rank":null,"pax":0.6,"region":"Ozeanien"},"AKL":{"name":"Auckland","lat":-37.01,"lon":174.79,"pop":1.7,"income":1.05,"biz":1.1,"tour":1.4,"land":6.3,"paxfee":20,"tax":12,"taxi":0,"country":"NZ","rank":null,"pax":19.0,"region":"Ozeanien"},"WLG":{"name":"Wellington","lat":-41.33,"lon":174.81,"pop":0.45,"income":1.05,"biz":1.2,"tour":0.9,"land":5.8,"paxfee":18,"tax":12,"taxi":0,"country":"NZ","rank":null,"pax":5.5,"region":"Ozeanien"},"CHC":{"name":"Christchurch","lat":-43.49,"lon":172.53,"pop":0.5,"income":1.05,"biz":0.8,"tour":1.2,"land":5.8,"paxfee":18,"tax":12,"taxi":0,"country":"NZ","rank":null,"pax":6.5,"region":"Ozeanien"},"ZQN":{"name":"Queenstown","lat":-45.02,"lon":168.74,"pop":0.05,"income":1.05,"biz":0.2,"tour":2.8,"land":5.7,"paxfee":18,"tax":12,"taxi":0,"country":"NZ","rank":null,"pax":2.4,"region":"Ozeanien"},"NAN":{"name":"Nadi (Fidschi)","lat":-17.76,"lon":177.44,"pop":0.3,"income":0.25,"biz":0.3,"tour":2.6,"land":4.9,"paxfee":20,"tax":30,"taxi":0,"country":"FJ","rank":null,"pax":2.3,"region":"Ozeanien"},"NOU":{"name":"Nouméa","lat":-22.01,"lon":166.21,"pop":0.27,"income":0.9,"biz":0.6,"tour":1.4,"land":6.4,"paxfee":20,"tax":10,"taxi":0,"country":"NC","rank":null,"pax":0.5,"region":"Ozeanien"},"PPT":{"name":"Papeete (Tahiti)","lat":-17.55,"lon":-149.61,"pop":0.28,"income":0.8,"biz":0.4,"tour":2.4,"land":6.5,"paxfee":20,"tax":10,"taxi":0,"country":"PF","rank":null,"pax":1.4,"region":"Ozeanien"},"POM":{"name":"Port Moresby","lat":-9.44,"lon":147.22,"pop":0.4,"income":0.12,"biz":0.6,"tour":0.2,"land":4.8,"paxfee":16,"tax":10,"taxi":0,"country":"PG","rank":null,"pax":1.5,"region":"Ozeanien"},"DPS":{"name":"Bali","lat":-8.75,"lon":115.17,"pop":4.4,"income":0.25,"biz":0.3,"tour":3.0,"land":3.6,"paxfee":9,"tax":4,"taxi":0,"country":"ID","rank":null,"pax":21.0,"region":"Asien"},"LED":{"name":"Sankt Petersburg","lat":59.8,"lon":30.26,"pop":5.4,"income":0.45,"biz":1.1,"tour":1.5,"land":4.5,"paxfee":11,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":20.0,"region":"Europa"},"AER":{"name":"Sotschi","lat":43.45,"lon":39.96,"pop":0.5,"income":0.45,"biz":0.4,"tour":2.4,"land":4.2,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":10.0,"region":"Europa"},"KZN":{"name":"Kasan","lat":55.61,"lon":49.28,"pop":1.3,"income":0.45,"biz":0.9,"tour":1.0,"land":4.1,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":4.5,"region":"Europa"},"SVX":{"name":"Jekaterinburg","lat":56.74,"lon":60.8,"pop":1.5,"income":0.45,"biz":1.0,"tour":0.6,"land":4.2,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":7.0,"region":"Europa"},"OVB":{"name":"Nowosibirsk","lat":55.01,"lon":82.65,"pop":1.6,"income":0.45,"biz":1.0,"tour":0.6,"land":4.2,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":7.5,"region":"Asien"},"IKT":{"name":"Irkutsk","lat":52.27,"lon":104.39,"pop":0.6,"income":0.45,"biz":0.7,"tour":1.2,"land":4.1,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":2.4,"region":"Asien"},"VVO":{"name":"Wladiwostok","lat":43.4,"lon":132.15,"pop":0.6,"income":0.45,"biz":0.8,"tour":1.0,"land":4.1,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":2.5,"region":"Asien"},"KGD":{"name":"Kaliningrad","lat":54.89,"lon":20.59,"pop":1.0,"income":0.45,"biz":0.8,"tour":1.0,"land":4.1,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":2.5,"region":"Europa"},"UFA":{"name":"Ufa","lat":54.56,"lon":55.87,"pop":1.1,"income":0.45,"biz":0.8,"tour":0.5,"land":4.1,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":3.5,"region":"Europa"},"KJA":{"name":"Krasnojarsk","lat":56.17,"lon":92.49,"pop":1.1,"income":0.45,"biz":0.8,"tour":0.5,"land":4.1,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":3.3,"region":"Asien"},"KHV":{"name":"Chabarowsk","lat":48.53,"lon":135.19,"pop":0.6,"income":0.45,"biz":0.7,"tour":0.5,"land":4.1,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":2.3,"region":"Asien"},"MMK":{"name":"Murmansk","lat":68.78,"lon":32.75,"pop":0.3,"income":0.45,"biz":0.6,"tour":0.8,"land":4.0,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":1.0,"region":"Europa"},"YKS":{"name":"Jakutsk","lat":62.09,"lon":129.77,"pop":0.35,"income":0.45,"biz":0.6,"tour":0.4,"land":4.0,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":1.2,"region":"Asien"},"MRV":{"name":"Mineralnyje Wody","lat":44.23,"lon":43.08,"pop":0.9,"income":0.45,"biz":0.4,"tour":1.4,"land":4.1,"paxfee":10,"tax":0,"taxi":0,"country":"RU","rank":null,"pax":3.5,"region":"Europa"},"DUR":{"name":"Durban","lat":-29.61,"lon":31.12,"pop":3.5,"income":0.3,"biz":0.9,"tour":1.4,"land":4.1,"paxfee":15,"tax":10,"taxi":0,"country":"ZA","rank":null,"pax":6.0,"region":"Afrika"},"ZNZ":{"name":"Sansibar","lat":-6.22,"lon":39.22,"pop":0.9,"income":0.08,"biz":0.2,"tour":2.6,"land":3.2,"paxfee":11,"tax":8,"taxi":0,"country":"TZ","rank":null,"pax":1.8,"region":"Afrika"},"JRO":{"name":"Kilimandscharo","lat":-3.43,"lon":37.07,"pop":1.0,"income":0.08,"biz":0.3,"tour":2.2,"land":3.2,"paxfee":11,"tax":8,"taxi":0,"country":"TZ","rank":null,"pax":1.0,"region":"Afrika"},"MBA":{"name":"Mombasa","lat":-4.03,"lon":39.59,"pop":1.3,"income":0.12,"biz":0.5,"tour":1.8,"land":3.2,"paxfee":12,"tax":8,"taxi":0,"country":"KE","rank":null,"pax":1.6,"region":"Afrika"},"KGL":{"name":"Kigali","lat":-1.97,"lon":30.14,"pop":1.6,"income":0.08,"biz":0.8,"tour":0.9,"land":4.0,"paxfee":16,"tax":8,"taxi":0,"country":"RW","rank":null,"pax":1.0,"region":"Afrika"},"EBB":{"name":"Entebbe","lat":0.04,"lon":32.44,"pop":3.5,"income":0.07,"biz":0.7,"tour":0.8,"land":4.1,"paxfee":16,"tax":8,"taxi":0,"country":"UG","rank":null,"pax":2.0,"region":"Afrika"},"LUN":{"name":"Lusaka","lat":-15.33,"lon":28.45,"pop":3.0,"income":0.1,"biz":0.7,"tour":0.5,"land":4.0,"paxfee":16,"tax":8,"taxi":0,"country":"ZM","rank":null,"pax":1.5,"region":"Afrika"},"HRE":{"name":"Harare","lat":-17.93,"lon":31.09,"pop":2.4,"income":0.1,"biz":0.7,"tour":0.5,"land":4.0,"paxfee":20,"tax":10,"taxi":0,"country":"ZW","rank":null,"pax":1.2,"region":"Afrika"},"VFA":{"name":"Victoria Falls","lat":-18.1,"lon":25.84,"pop":0.05,"income":0.1,"biz":0.1,"tour":3.0,"land":4.0,"paxfee":20,"tax":10,"taxi":0,"country":"ZW","rank":null,"pax":0.4,"region":"Afrika"},"MPM":{"name":"Maputo","lat":-25.92,"lon":32.57,"pop":2.5,"income":0.06,"biz":0.7,"tour":0.8,"land":4.0,"paxfee":16,"tax":8,"taxi":0,"country":"MZ","rank":null,"pax":1.0,"region":"Afrika"},"WDH":{"name":"Windhuk","lat":-22.48,"lon":17.47,"pop":0.5,"income":0.3,"biz":0.7,"tour":1.6,"land":4.0,"paxfee":16,"tax":8,"taxi":0,"country":"NA","rank":null,"pax":1.0,"region":"Afrika"},"LAD":{"name":"Luanda","lat":-8.86,"lon":13.23,"pop":8.5,"income":0.15,"biz":1.0,"tour":0.3,"land":4.9,"paxfee":20,"tax":10,"taxi":0,"country":"AO","rank":null,"pax":2.5,"region":"Afrika"},"ABJ":{"name":"Abidjan","lat":5.26,"lon":-3.93,"pop":5.5,"income":0.12,"biz":1.0,"tour":0.6,"land":4.1,"paxfee":18,"tax":10,"taxi":0,"country":"CI","rank":null,"pax":2.5,"region":"Afrika"},"DLA":{"name":"Douala","lat":4.01,"lon":9.72,"pop":3.5,"income":0.08,"biz":0.9,"tour":0.3,"land":4.0,"paxfee":18,"tax":10,"taxi":0,"country":"CM","rank":null,"pax":1.2,"region":"Afrika"},"ABV":{"name":"Abuja","lat":9.01,"lon":7.26,"pop":3.5,"income":0.12,"biz":1.1,"tour":0.3,"land":4.1,"paxfee":16,"tax":10,"taxi":0,"country":"NG","rank":null,"pax":5.0,"region":"Afrika"},"SEZ":{"name":"Seychellen","lat":-4.67,"lon":55.52,"pop":0.1,"income":0.7,"biz":0.3,"tour":2.8,"land":4.8,"paxfee":20,"tax":10,"taxi":0,"country":"SC","rank":null,"pax":1.0,"region":"Afrika"},"TNR":{"name":"Antananarivo","lat":-18.8,"lon":47.48,"pop":3.5,"income":0.05,"biz":0.6,"tour":0.9,"land":4.0,"paxfee":16,"tax":8,"taxi":0,"country":"MG","rank":null,"pax":1.2,"region":"Afrika"},"SSH":{"name":"Scharm El-Scheich","lat":27.98,"lon":34.39,"pop":0.1,"income":0.2,"biz":0.1,"tour":3.0,"land":3.4,"paxfee":13,"tax":10,"taxi":0,"country":"EG","rank":null,"pax":8.0,"region":"Afrika"},"LXR":{"name":"Luxor","lat":25.67,"lon":32.71,"pop":0.5,"income":0.2,"biz":0.2,"tour":2.4,"land":3.2,"paxfee":12,"tax":10,"taxi":0,"country":"EG","rank":null,"pax":2.0,"region":"Afrika"},"AGA":{"name":"Agadir","lat":30.38,"lon":-9.55,"pop":1.0,"income":0.22,"biz":0.3,"tour":2.4,"land":3.2,"paxfee":11,"tax":5,"taxi":0,"country":"MA","rank":null,"pax":2.5,"region":"Afrika"},"GIG":{"name":"Rio de Janeiro","lat":-22.81,"lon":-43.25,"pop":13.0,"income":0.5,"biz":1.1,"tour":2.0,"land":4.4,"paxfee":13,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":15.0,"region":"Lateinamerika"},"BSB":{"name":"Brasília","lat":-15.87,"lon":-47.92,"pop":4.7,"income":0.5,"biz":1.2,"tour":0.5,"land":4.4,"paxfee":13,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":15.0,"region":"Lateinamerika"},"CNF":{"name":"Belo Horizonte","lat":-19.62,"lon":-43.97,"pop":6.0,"income":0.5,"biz":0.9,"tour":0.5,"land":4.2,"paxfee":13,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":10.0,"region":"Lateinamerika"},"SSA":{"name":"Salvador","lat":-12.91,"lon":-38.33,"pop":4.0,"income":0.5,"biz":0.6,"tour":1.6,"land":4.2,"paxfee":13,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":8.0,"region":"Lateinamerika"},"REC":{"name":"Recife","lat":-8.13,"lon":-34.92,"pop":4.0,"income":0.5,"biz":0.7,"tour":1.4,"land":4.2,"paxfee":13,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":9.0,"region":"Lateinamerika"},"FOR":{"name":"Fortaleza","lat":-3.78,"lon":-38.53,"pop":4.0,"income":0.5,"biz":0.6,"tour":1.5,"land":4.2,"paxfee":13,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":7.0,"region":"Lateinamerika"},"POA":{"name":"Porto Alegre","lat":-29.99,"lon":-51.17,"pop":4.3,"income":0.5,"biz":0.9,"tour":0.6,"land":4.2,"paxfee":12,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":6.5,"region":"Lateinamerika"},"FLN":{"name":"Florianópolis","lat":-27.67,"lon":-48.55,"pop":1.2,"income":0.5,"biz":0.5,"tour":1.8,"land":4.1,"paxfee":12,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":4.5,"region":"Lateinamerika"},"MAO":{"name":"Manaus","lat":-3.04,"lon":-60.05,"pop":2.3,"income":0.5,"biz":0.7,"tour":1.0,"land":4.1,"paxfee":12,"tax":10,"taxi":0,"country":"BR","rank":null,"pax":3.5,"region":"Lateinamerika"},"EZE":{"name":"Buenos Aires","lat":-34.82,"lon":-58.54,"pop":15.0,"income":0.45,"biz":1.2,"tour":1.6,"land":4.3,"paxfee":17,"tax":15,"taxi":0,"country":"AR","rank":null,"pax":13.0,"region":"Lateinamerika"},"COR":{"name":"Córdoba (Argentinien)","lat":-31.32,"lon":-64.21,"pop":1.8,"income":0.45,"biz":0.8,"tour":0.8,"land":4.1,"paxfee":16,"tax":15,"taxi":0,"country":"AR","rank":null,"pax":3.5,"region":"Lateinamerika"},"MDZ":{"name":"Mendoza","lat":-32.83,"lon":-68.79,"pop":1.2,"income":0.45,"biz":0.6,"tour":1.6,"land":4.1,"paxfee":16,"tax":15,"taxi":0,"country":"AR","rank":null,"pax":2.3,"region":"Lateinamerika"},"BRC":{"name":"Bariloche","lat":-41.15,"lon":-71.16,"pop":0.15,"income":0.45,"biz":0.2,"tour":2.6,"land":4.1,"paxfee":16,"tax":15,"taxi":0,"country":"AR","rank":null,"pax":2.0,"region":"Lateinamerika"},"MVD":{"name":"Montevideo","lat":-34.84,"lon":-56.03,"pop":1.8,"income":0.6,"biz":0.9,"tour":1.2,"land":4.1,"paxfee":20,"tax":15,"taxi":0,"country":"UY","rank":null,"pax":2.2,"region":"Lateinamerika"},"UIO":{"name":"Quito","lat":-0.13,"lon":-78.36,"pop":2.8,"income":0.35,"biz":0.9,"tour":1.2,"land":3.3,"paxfee":21,"tax":12,"taxi":0,"country":"EC","rank":null,"pax":5.0,"region":"Lateinamerika"},"GYE":{"name":"Guayaquil","lat":-2.16,"lon":-79.88,"pop":3.0,"income":0.35,"biz":0.9,"tour":0.9,"land":3.3,"paxfee":20,"tax":12,"taxi":0,"country":"EC","rank":null,"pax":4.0,"region":"Lateinamerika"},"MDE":{"name":"Medellín","lat":6.16,"lon":-75.42,"pop":4.0,"income":0.42,"biz":0.9,"tour":1.2,"land":3.4,"paxfee":15,"tax":15,"taxi":0,"country":"CO","rank":null,"pax":11.0,"region":"Lateinamerika"},"CTG":{"name":"Cartagena","lat":10.44,"lon":-75.51,"pop":1.0,"income":0.42,"biz":0.4,"tour":2.2,"land":3.3,"paxfee":15,"tax":15,"taxi":0,"country":"CO","rank":null,"pax":6.0,"region":"Lateinamerika"},"CLO":{"name":"Cali","lat":3.54,"lon":-76.38,"pop":2.8,"income":0.42,"biz":0.8,"tour":0.7,"land":3.3,"paxfee":15,"tax":15,"taxi":0,"country":"CO","rank":null,"pax":5.5,"region":"Lateinamerika"},"CUZ":{"name":"Cusco","lat":-13.54,"lon":-71.94,"pop":0.5,"income":0.42,"biz":0.2,"tour":2.8,"land":3.3,"paxfee":16,"tax":12,"taxi":0,"country":"PE","rank":null,"pax":3.5,"region":"Lateinamerika"},"ASU":{"name":"Asunción","lat":-25.24,"lon":-57.52,"pop":2.5,"income":0.3,"biz":0.8,"tour":0.4,"land":3.2,"paxfee":16,"tax":10,"taxi":0,"country":"PY","rank":null,"pax":1.2,"region":"Lateinamerika"},"VVI":{"name":"Santa Cruz de la Sierra","lat":-17.64,"lon":-63.14,"pop":2.0,"income":0.2,"biz":0.8,"tour":0.4,"land":3.3,"paxfee":12,"tax":8,"taxi":0,"country":"BO","rank":null,"pax":3.0,"region":"Lateinamerika"},"PTY":{"name":"Panama-Stadt","lat":9.07,"lon":-79.38,"pop":2.0,"income":0.6,"biz":1.1,"tour":1.0,"land":4.5,"paxfee":18,"tax":10,"taxi":0,"country":"PA","rank":null,"pax":18.0,"region":"Lateinamerika"},"YUL":{"name":"Montréal","lat":45.47,"lon":-73.74,"pop":4.3,"income":1.15,"biz":1.1,"tour":1.3,"land":5.4,"paxfee":23,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":21.0,"region":"Nordamerika"},"YYC":{"name":"Calgary","lat":51.13,"lon":-114.01,"pop":1.6,"income":1.15,"biz":1.1,"tour":0.9,"land":5.3,"paxfee":22,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":18.0,"region":"Nordamerika"},"YEG":{"name":"Edmonton","lat":53.31,"lon":-113.58,"pop":1.5,"income":1.15,"biz":1.0,"tour":0.6,"land":5.0,"paxfee":21,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":8.0,"region":"Nordamerika"},"YOW":{"name":"Ottawa","lat":45.32,"lon":-75.67,"pop":1.5,"income":1.15,"biz":1.3,"tour":0.8,"land":4.9,"paxfee":21,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":5.0,"region":"Nordamerika"},"YWG":{"name":"Winnipeg","lat":49.91,"lon":-97.24,"pop":0.85,"income":1.15,"biz":0.9,"tour":0.6,"land":4.9,"paxfee":21,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":4.5,"region":"Nordamerika"},"YHZ":{"name":"Halifax","lat":44.88,"lon":-63.51,"pop":0.45,"income":1.15,"biz":0.9,"tour":0.9,"land":4.9,"paxfee":21,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":4.2,"region":"Nordamerika"},"YQB":{"name":"Québec","lat":46.79,"lon":-71.39,"pop":0.85,"income":1.15,"biz":0.8,"tour":1.2,"land":4.9,"paxfee":20,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":1.8,"region":"Nordamerika"},"YYJ":{"name":"Victoria (Kanada)","lat":48.65,"lon":-123.43,"pop":0.4,"income":1.15,"biz":0.8,"tour":1.3,"land":4.9,"paxfee":20,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":2.0,"region":"Nordamerika"},"YXE":{"name":"Saskatoon","lat":52.17,"lon":-106.7,"pop":0.33,"income":1.15,"biz":0.8,"tour":0.4,"land":4.8,"paxfee":20,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":1.5,"region":"Nordamerika"},"YQR":{"name":"Regina","lat":50.43,"lon":-104.67,"pop":0.26,"income":1.15,"biz":0.8,"tour":0.3,"land":4.8,"paxfee":20,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":1.2,"region":"Nordamerika"},"YYT":{"name":"St. John's","lat":47.62,"lon":-52.75,"pop":0.21,"income":1.15,"biz":0.8,"tour":0.9,"land":4.8,"paxfee":20,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":1.5,"region":"Nordamerika"},"YXY":{"name":"Whitehorse","lat":60.71,"lon":-135.07,"pop":0.04,"income":1.15,"biz":0.5,"tour":1.4,"land":4.8,"paxfee":20,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":0.4,"region":"Nordamerika"},"YZF":{"name":"Yellowknife","lat":62.46,"lon":-114.44,"pop":0.02,"income":1.15,"biz":0.6,"tour":0.8,"land":4.8,"paxfee":20,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":0.5,"region":"Nordamerika"},"YFB":{"name":"Iqaluit","lat":63.76,"lon":-68.56,"pop":0.008,"income":1.15,"biz":0.6,"tour":0.4,"land":4.8,"paxfee":20,"tax":15,"taxi":0,"country":"CA","rank":null,"pax":0.15,"region":"Nordamerika"},"HAJ":{"name":"Hannover","lat":52.46,"lon":9.69,"pop":2.0,"income":1.1,"biz":1.0,"tour":0.6,"land":5.8,"paxfee":17,"tax":15,"taxi":0,"country":"DE","rank":null,"pax":5.6,"region":"Europa"},"STR":{"name":"Stuttgart","lat":48.69,"lon":9.22,"pop":2.7,"income":1.1,"biz":1.3,"tour":0.7,"land":5.9,"paxfee":17,"tax":15,"taxi":0,"country":"DE","rank":null,"pax":9.0,"region":"Europa"},"CGN":{"name":"Köln/Bonn","lat":50.87,"lon":7.14,"pop":3.0,"income":1.1,"biz":1.1,"tour":0.8,"land":5.9,"paxfee":17,"tax":15,"taxi":0,"country":"DE","rank":null,"pax":9.8,"region":"Europa"},"NUE":{"name":"Nürnberg","lat":49.5,"lon":11.08,"pop":1.3,"income":1.1,"biz":1.0,"tour":0.8,"land":5.7,"paxfee":16,"tax":15,"taxi":0,"country":"DE","rank":null,"pax":3.9,"region":"Europa"},"LEJ":{"name":"Leipzig/Halle","lat":51.42,"lon":12.24,"pop":1.1,"income":1.1,"biz":0.8,"tour":0.6,"land":5.7,"paxfee":16,"tax":15,"taxi":0,"country":"DE","rank":null,"pax":2.2,"region":"Europa"},"BRE":{"name":"Bremen","lat":53.05,"lon":8.79,"pop":1.0,"income":1.1,"biz":0.9,"tour":0.6,"land":5.7,"paxfee":16,"tax":15,"taxi":0,"country":"DE","rank":null,"pax":2.1,"region":"Europa"},"BRU":{"name":"Brüssel","lat":50.9,"lon":4.48,"pop":3.5,"income":1.1,"biz":1.4,"tour":1.1,"land":7.3,"paxfee":23,"tax":10,"taxi":0,"country":"BE","rank":null,"pax":22.0,"region":"Europa"},"CRL":{"name":"Brüssel-Charleroi","lat":50.46,"lon":4.45,"pop":1.5,"income":1.1,"biz":0.6,"tour":0.9,"land":6.8,"paxfee":21,"tax":10,"taxi":0,"country":"BE","rank":null,"pax":10.0,"region":"Europa"},"OSL":{"name":"Oslo","lat":60.19,"lon":11.1,"pop":2.0,"income":1.5,"biz":1.3,"tour":1.0,"land":7.5,"paxfee":24,"tax":8,"taxi":0,"country":"NO","rank":null,"pax":28.0,"region":"Europa"},"BGO":{"name":"Bergen","lat":60.29,"lon":5.22,"pop":0.6,"income":1.5,"biz":1.0,"tour":1.2,"land":6.6,"paxfee":21,"tax":8,"taxi":0,"country":"NO","rank":null,"pax":6.0,"region":"Europa"},"ARN":{"name":"Stockholm","lat":59.65,"lon":17.92,"pop":2.4,"income":1.2,"biz":1.3,"tour":1.0,"land":6.4,"paxfee":20,"tax":7,"taxi":0,"country":"SE","rank":null,"pax":23.0,"region":"Europa"},"GOT":{"name":"Göteborg","lat":57.66,"lon":12.28,"pop":1.0,"income":1.2,"biz":1.0,"tour":0.8,"land":5.8,"paxfee":18,"tax":7,"taxi":0,"country":"SE","rank":null,"pax":5.0,"region":"Europa"},"HEL":{"name":"Helsinki","lat":60.32,"lon":24.96,"pop":1.6,"income":1.1,"biz":1.2,"tour":1.0,"land":6.2,"paxfee":19,"tax":0,"taxi":0,"country":"FI","rank":null,"pax":16.0,"region":"Europa"},"BLL":{"name":"Billund","lat":55.74,"lon":9.15,"pop":0.8,"income":1.3,"biz":0.7,"tour":1.2,"land":5.7,"paxfee":18,"tax":0,"taxi":0,"country":"DK","rank":null,"pax":3.8,"region":"Europa"},"WAW":{"name":"Warschau","lat":52.17,"lon":20.97,"pop":3.2,"income":0.6,"biz":1.1,"tour":0.9,"land":4.5,"paxfee":14,"tax":0,"taxi":0,"country":"PL","rank":null,"pax":21.0,"region":"Europa"},"KRK":{"name":"Krakau","lat":50.08,"lon":19.78,"pop":1.5,"income":0.6,"biz":0.8,"tour":1.4,"land":4.3,"paxfee":13,"tax":0,"taxi":0,"country":"PL","rank":null,"pax":11.0,"region":"Europa"},"GDN":{"name":"Danzig","lat":54.38,"lon":18.47,"pop":1.1,"income":0.6,"biz":0.7,"tour":1.0,"land":4.1,"paxfee":12,"tax":0,"taxi":0,"country":"PL","rank":null,"pax":6.0,"region":"Europa"},"PRG":{"name":"Prag","lat":50.1,"lon":14.26,"pop":2.2,"income":0.7,"biz":1.1,"tour":1.6,"land":5.2,"paxfee":16,"tax":0,"taxi":0,"country":"CZ","rank":null,"pax":14.0,"region":"Europa"},"BUD":{"name":"Budapest","lat":47.44,"lon":19.26,"pop":3.0,"income":0.55,"biz":1.0,"tour":1.4,"land":4.4,"paxfee":16,"tax":5,"taxi":0,"country":"HU","rank":null,"pax":17.0,"region":"Europa"},"OTP":{"name":"Bukarest","lat":44.57,"lon":26.08,"pop":2.3,"income":0.45,"biz":0.9,"tour":0.7,"land":4.4,"paxfee":13,"tax":0,"taxi":0,"country":"RO","rank":null,"pax":16.0,"region":"Europa"},"SOF":{"name":"Sofia","lat":42.7,"lon":23.41,"pop":1.5,"income":0.35,"biz":0.8,"tour":0.8,"land":4.2,"paxfee":13,"tax":0,"taxi":0,"country":"BG","rank":null,"pax":8.0,"region":"Europa"},"VAR":{"name":"Warna","lat":43.23,"lon":27.83,"pop":0.5,"income":0.35,"biz":0.4,"tour":1.6,"land":4.1,"paxfee":12,"tax":0,"taxi":0,"country":"BG","rank":null,"pax":2.5,"region":"Europa"},"BEG":{"name":"Belgrad","lat":44.82,"lon":20.31,"pop":1.7,"income":0.3,"biz":0.8,"tour":0.8,"land":4.2,"paxfee":13,"tax":0,"taxi":0,"country":"RS","rank":null,"pax":8.0,"region":"Europa"},"ZAG":{"name":"Zagreb","lat":45.74,"lon":16.07,"pop":1.1,"income":0.55,"biz":0.8,"tour":0.8,"land":4.9,"paxfee":15,"tax":0,"taxi":0,"country":"HR","rank":null,"pax":4.0,"region":"Europa"},"SPU":{"name":"Split","lat":43.54,"lon":16.3,"pop":0.4,"income":0.55,"biz":0.4,"tour":2.2,"land":4.9,"paxfee":15,"tax":0,"taxi":0,"country":"HR","rank":null,"pax":4.0,"region":"Europa"},"DBV":{"name":"Dubrovnik","lat":42.56,"lon":18.27,"pop":0.2,"income":0.55,"biz":0.4,"tour":2.4,"land":4.9,"paxfee":15,"tax":0,"taxi":0,"country":"HR","rank":null,"pax":3.0,"region":"Europa"},"KEF":{"name":"Reykjavík","lat":63.99,"lon":-22.62,"pop":0.25,"income":1.3,"biz":0.7,"tour":2.0,"land":6.7,"paxfee":21,"tax":0,"taxi":0,"country":"IS","rank":null,"pax":8.0,"region":"Europa"},"RIX":{"name":"Riga","lat":56.92,"lon":23.97,"pop":1.0,"income":0.55,"biz":0.8,"tour":1.0,"land":4.2,"paxfee":13,"tax":0,"taxi":0,"country":"LV","rank":null,"pax":7.0,"region":"Europa"},"VNO":{"name":"Vilnius","lat":54.63,"lon":25.29,"pop":0.8,"income":0.6,"biz":0.7,"tour":0.8,"land":4.1,"paxfee":12,"tax":0,"taxi":0,"country":"LT","rank":null,"pax":5.0,"region":"Europa"},"TLL":{"name":"Tallinn","lat":59.41,"lon":24.83,"pop":0.6,"income":0.65,"biz":0.9,"tour":1.1,"land":4.1,"paxfee":12,"tax":0,"taxi":0,"country":"EE","rank":null,"pax":3.2,"region":"Europa"},"MLA":{"name":"Malta","lat":35.86,"lon":14.48,"pop":0.5,"income":0.8,"biz":0.6,"tour":2.2,"land":5.0,"paxfee":15,"tax":0,"taxi":0,"country":"MT","rank":null,"pax":8.0,"region":"Europa"},"LCA":{"name":"Larnaka","lat":34.88,"lon":33.63,"pop":0.9,"income":0.8,"biz":0.7,"tour":2.0,"land":5.1,"paxfee":17,"tax":0,"taxi":0,"country":"CY","rank":null,"pax":9.0,"region":"Europa"},"SKG":{"name":"Thessaloniki","lat":40.52,"lon":22.97,"pop":1.1,"income":0.6,"biz":0.7,"tour":1.4,"land":5.0,"paxfee":18,"tax":0,"taxi":0,"country":"GR","rank":null,"pax":7.0,"region":"Europa"},"HER":{"name":"Heraklion","lat":35.34,"lon":25.18,"pop":0.3,"income":0.6,"biz":0.3,"tour":2.6,"land":5.1,"paxfee":19,"tax":0,"taxi":0,"country":"GR","rank":null,"pax":9.0,"region":"Europa"},"RHO":{"name":"Rhodos","lat":36.41,"lon":28.09,"pop":0.1,"income":0.6,"biz":0.2,"tour":2.6,"land":5.0,"paxfee":18,"tax":0,"taxi":0,"country":"GR","rank":null,"pax":6.0,"region":"Europa"},"CFU":{"name":"Korfu","lat":39.6,"lon":19.91,"pop":0.1,"income":0.6,"biz":0.2,"tour":2.4,"land":4.9,"paxfee":18,"tax":0,"taxi":0,"country":"GR","rank":null,"pax":3.5,"region":"Europa"},"MXP":{"name":"Mailand-Malpensa","lat":45.63,"lon":8.72,"pop":7.0,"income":0.85,"biz":1.4,"tour":1.3,"land":6.6,"paxfee":19,"tax":7,"taxi":0,"country":"IT","rank":null,"pax":29.0,"region":"Europa"},"LIN":{"name":"Mailand-Linate","lat":45.45,"lon":9.28,"pop":4.0,"income":0.85,"biz":1.4,"tour":0.8,"land":6.0,"paxfee":17,"tax":7,"taxi":0,"country":"IT","rank":null,"pax":10.0,"region":"Europa"},"BGY":{"name":"Bergamo","lat":45.67,"lon":9.7,"pop":3.0,"income":0.85,"biz":0.7,"tour":1.0,"land":6.2,"paxfee":18,"tax":7,"taxi":0,"country":"IT","rank":null,"pax":17.0,"region":"Europa"},"VCE":{"name":"Venedig","lat":45.51,"lon":12.35,"pop":2.0,"income":0.85,"biz":0.9,"tour":2.0,"land":6.0,"paxfee":17,"tax":7,"taxi":0,"country":"IT","rank":null,"pax":11.0,"region":"Europa"},"NAP":{"name":"Neapel","lat":40.88,"lon":14.29,"pop":3.0,"income":0.85,"biz":0.7,"tour":1.6,"land":6.0,"paxfee":17,"tax":7,"taxi":0,"country":"IT","rank":null,"pax":12.5,"region":"Europa"},"CTA":{"name":"Catania","lat":37.47,"lon":15.07,"pop":1.5,"income":0.85,"biz":0.5,"tour":1.8,"land":6.0,"paxfee":17,"tax":7,"taxi":0,"country":"IT","rank":null,"pax":12.0,"region":"Europa"},"PMO":{"name":"Palermo","lat":38.18,"lon":13.1,"pop":1.2,"income":0.85,"biz":0.5,"tour":1.7,"land":5.9,"paxfee":17,"tax":7,"taxi":0,"country":"IT","rank":null,"pax":8.0,"region":"Europa"},"BLQ":{"name":"Bologna","lat":44.53,"lon":11.29,"pop":1.5,"income":0.85,"biz":1.0,"tour":1.0,"land":6.0,"paxfee":17,"tax":7,"taxi":0,"country":"IT","rank":null,"pax":10.0,"region":"Europa"},"AGP":{"name":"Málaga","lat":36.67,"lon":-4.5,"pop":1.5,"income":0.85,"biz":0.6,"tour":2.4,"land":4.6,"paxfee":14,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":24.0,"region":"Europa"},"ALC":{"name":"Alicante","lat":38.28,"lon":-0.56,"pop":1.5,"income":0.85,"biz":0.5,"tour":2.2,"land":4.5,"paxfee":13,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":18.0,"region":"Europa"},"VLC":{"name":"Valencia","lat":39.49,"lon":-0.48,"pop":2.0,"income":0.85,"biz":0.8,"tour":1.4,"land":4.2,"paxfee":13,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":10.0,"region":"Europa"},"SVQ":{"name":"Sevilla","lat":37.42,"lon":-5.9,"pop":1.5,"income":0.85,"biz":0.7,"tour":1.6,"land":4.2,"paxfee":13,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":9.0,"region":"Europa"},"BIO":{"name":"Bilbao","lat":43.3,"lon":-2.91,"pop":1.2,"income":0.85,"biz":1.0,"tour":1.0,"land":4.2,"paxfee":12,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":6.3,"region":"Europa"},"TFS":{"name":"Teneriffa-Süd","lat":28.04,"lon":-16.57,"pop":0.5,"income":0.85,"biz":0.3,"tour":2.6,"land":4.3,"paxfee":13,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":12.0,"region":"Europa"},"LPA":{"name":"Gran Canaria","lat":27.93,"lon":-15.39,"pop":0.9,"income":0.85,"biz":0.5,"tour":2.4,"land":4.4,"paxfee":13,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":15.0,"region":"Europa"},"ACE":{"name":"Lanzarote","lat":28.95,"lon":-13.61,"pop":0.15,"income":0.85,"biz":0.2,"tour":2.6,"land":4.2,"paxfee":13,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":8.5,"region":"Europa"},"FUE":{"name":"Fuerteventura","lat":28.45,"lon":-13.86,"pop":0.12,"income":0.85,"biz":0.2,"tour":2.6,"land":4.2,"paxfee":13,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":7.0,"region":"Europa"},"IBZ":{"name":"Ibiza","lat":38.87,"lon":1.37,"pop":0.15,"income":0.85,"biz":0.3,"tour":2.8,"land":4.2,"paxfee":13,"tax":0,"taxi":0,"country":"ES","rank":null,"pax":9.0,"region":"Europa"},"OPO":{"name":"Porto","lat":41.24,"lon":-8.68,"pop":1.8,"income":0.75,"biz":0.8,"tour":1.4,"land":5.2,"paxfee":16,"tax":0,"taxi":0,"country":"PT","rank":null,"pax":15.0,"region":"Europa"},"FAO":{"name":"Faro","lat":37.01,"lon":-7.97,"pop":0.5,"income":0.75,"biz":0.3,"tour":2.4,"land":5.1,"paxfee":15,"tax":0,"taxi":0,"country":"PT","rank":null,"pax":10.0,"region":"Europa"},"FNC":{"name":"Madeira","lat":32.7,"lon":-16.77,"pop":0.3,"income":0.75,"biz":0.3,"tour":2.2,"land":4.9,"paxfee":15,"tax":0,"taxi":0,"country":"PT","rank":null,"pax":4.5,"region":"Europa"},"NCE":{"name":"Nizza","lat":43.66,"lon":7.22,"pop":1.0,"income":1.1,"biz":0.9,"tour":2.2,"land":7.9,"paxfee":21,"tax":7,"taxi":0,"country":"FR","rank":null,"pax":14.8,"region":"Europa"},"MRS":{"name":"Marseille","lat":43.44,"lon":5.21,"pop":1.8,"income":1.1,"biz":0.9,"tour":1.4,"land":7.6,"paxfee":20,"tax":7,"taxi":0,"country":"FR","rank":null,"pax":10.0,"region":"Europa"},"LYS":{"name":"Lyon","lat":45.73,"lon":5.08,"pop":2.3,"income":1.1,"biz":1.1,"tour":1.0,"land":7.6,"paxfee":20,"tax":7,"taxi":0,"country":"FR","rank":null,"pax":10.0,"region":"Europa"},"TLS":{"name":"Toulouse","lat":43.63,"lon":1.36,"pop":1.4,"income":1.1,"biz":1.1,"tour":0.9,"land":7.5,"paxfee":20,"tax":7,"taxi":0,"country":"FR","rank":null,"pax":7.5,"region":"Europa"},"BOD":{"name":"Bordeaux","lat":44.83,"lon":-0.72,"pop":1.2,"income":1.1,"biz":0.9,"tour":1.1,"land":7.5,"paxfee":20,"tax":7,"taxi":0,"country":"FR","rank":null,"pax":6.8,"region":"Europa"},"NTE":{"name":"Nantes","lat":47.15,"lon":-1.61,"pop":1.0,"income":1.1,"biz":0.8,"tour":0.9,"land":7.5,"paxfee":20,"tax":7,"taxi":0,"country":"FR","rank":null,"pax":7.0,"region":"Europa"},"GVA":{"name":"Genf","lat":46.24,"lon":6.11,"pop":1.0,"income":1.5,"biz":1.6,"tour":1.3,"land":8.0,"paxfee":27,"tax":0,"taxi":0,"country":"CH","rank":null,"pax":17.8,"region":"Europa"},"BSL":{"name":"Basel","lat":47.6,"lon":7.53,"pop":1.0,"income":1.5,"biz":1.2,"tour":0.8,"land":7.6,"paxfee":25,"tax":0,"taxi":0,"country":"CH","rank":null,"pax":8.9,"region":"Europa"},"STN":{"name":"London-Stansted","lat":51.88,"lon":0.24,"pop":4.0,"income":1.15,"biz":0.6,"tour":1.0,"land":8.5,"paxfee":28,"tax":15,"taxi":0,"country":"GB","rank":null,"pax":29.0,"region":"Europa"},"LTN":{"name":"London-Luton","lat":51.87,"lon":-0.37,"pop":3.0,"income":1.15,"biz":0.6,"tour":0.9,"land":7.9,"paxfee":26,"tax":15,"taxi":0,"country":"GB","rank":null,"pax":16.0,"region":"Europa"},"EDI":{"name":"Edinburgh","lat":55.95,"lon":-3.37,"pop":1.4,"income":1.15,"biz":1.1,"tour":1.6,"land":7.8,"paxfee":26,"tax":15,"taxi":0,"country":"GB","rank":null,"pax":14.0,"region":"Europa"},"GLA":{"name":"Glasgow","lat":55.87,"lon":-4.43,"pop":1.8,"income":1.15,"biz":0.9,"tour":1.0,"land":7.5,"paxfee":25,"tax":15,"taxi":0,"country":"GB","rank":null,"pax":7.0,"region":"Europa"},"BHX":{"name":"Birmingham","lat":52.45,"lon":-1.75,"pop":3.0,"income":1.15,"biz":1.0,"tour":0.8,"land":7.7,"paxfee":26,"tax":15,"taxi":0,"country":"GB","rank":null,"pax":12.0,"region":"Europa"},"BRS":{"name":"Bristol","lat":51.38,"lon":-2.72,"pop":1.3,"income":1.15,"biz":0.8,"tour":0.8,"land":7.6,"paxfee":25,"tax":15,"taxi":0,"country":"GB","rank":null,"pax":9.0,"region":"Europa"},"EIN":{"name":"Eindhoven","lat":51.45,"lon":5.37,"pop":1.0,"income":1.15,"biz":0.8,"tour":0.6,"land":6.7,"paxfee":28,"tax":29,"taxi":0,"country":"NL","rank":null,"pax":7.0,"region":"Europa"},"SZG":{"name":"Salzburg","lat":47.79,"lon":13.0,"pop":0.5,"income":1.05,"biz":0.6,"tour":1.8,"land":6.5,"paxfee":20,"tax":12,"taxi":0,"country":"AT","rank":null,"pax":2.0,"region":"Europa"},"ADB":{"name":"Izmir","lat":38.29,"lon":27.16,"pop":3.0,"income":0.45,"biz":0.8,"tour":1.3,"land":3.5,"paxfee":13,"tax":5,"taxi":0,"country":"TR","rank":null,"pax":12.5,"region":"Europa"},"ESB":{"name":"Ankara","lat":40.13,"lon":32.99,"pop":5.0,"income":0.45,"biz":1.0,"tour":0.6,"land":3.5,"paxfee":13,"tax":5,"taxi":0,"country":"TR","rank":null,"pax":13.0,"region":"Europa"},"DLM":{"name":"Dalaman","lat":36.71,"lon":28.79,"pop":0.2,"income":0.45,"biz":0.2,"tour":2.6,"land":3.3,"paxfee":12,"tax":5,"taxi":0,"country":"TR","rank":null,"pax":5.5,"region":"Europa"},"BJV":{"name":"Bodrum","lat":37.25,"lon":27.66,"pop":0.2,"income":0.45,"biz":0.2,"tour":2.6,"land":3.3,"paxfee":12,"tax":5,"taxi":0,"country":"TR","rank":null,"pax":4.5,"region":"Europa"},"TLV":{"name":"Tel Aviv","lat":32.01,"lon":34.89,"pop":4.5,"income":1.0,"biz":1.3,"tour":1.2,"land":5.5,"paxfee":18,"tax":10,"taxi":0,"country":"IL","rank":null,"pax":22.0,"region":"Nahost"},"AMM":{"name":"Amman","lat":31.72,"lon":35.99,"pop":4.0,"income":0.25,"biz":0.8,"tour":1.0,"land":4.2,"paxfee":17,"tax":10,"taxi":0,"country":"JO","rank":null,"pax":9.0,"region":"Nahost"},"BEY":{"name":"Beirut","lat":33.82,"lon":35.49,"pop":2.4,"income":0.2,"biz":0.8,"tour":1.0,"land":4.2,"paxfee":17,"tax":10,"taxi":0,"country":"LB","rank":null,"pax":7.0,"region":"Nahost"},"KWI":{"name":"Kuwait","lat":29.24,"lon":47.97,"pop":4.3,"income":0.9,"biz":1.1,"tour":0.4,"land":4.4,"paxfee":13,"tax":5,"taxi":0,"country":"KW","rank":null,"pax":15.0,"region":"Nahost"},"BAH":{"name":"Bahrain","lat":26.27,"lon":50.63,"pop":1.5,"income":0.8,"biz":1.1,"tour":0.7,"land":4.2,"paxfee":15,"tax":5,"taxi":0,"country":"BH","rank":null,"pax":9.0,"region":"Nahost"},"MCT":{"name":"Maskat","lat":23.59,"lon":58.28,"pop":1.7,"income":0.6,"biz":0.9,"tour":1.2,"land":4.3,"paxfee":16,"tax":5,"taxi":0,"country":"OM","rank":null,"pax":13.0,"region":"Nahost"},"DMM":{"name":"Dammam","lat":26.47,"lon":49.8,"pop":3.0,"income":0.8,"biz":1.0,"tour":0.3,"land":4.3,"paxfee":15,"tax":12,"taxi":0,"country":"SA","rank":null,"pax":11.0,"region":"Nahost"},"MED":{"name":"Medina","lat":24.55,"lon":39.71,"pop":1.5,"income":0.8,"biz":0.4,"tour":1.5,"land":4.2,"paxfee":15,"tax":12,"taxi":0,"country":"SA","rank":null,"pax":9.0,"region":"Nahost"},"SHJ":{"name":"Schardscha","lat":25.33,"lon":55.52,"pop":1.8,"income":1.2,"biz":0.6,"tour":1.0,"land":4.4,"paxfee":18,"tax":10,"taxi":0,"country":"AE","rank":null,"pax":17.0,"region":"Nahost"},"IKA":{"name":"Teheran","lat":35.42,"lon":51.15,"pop":15.0,"income":0.15,"biz":0.8,"tour":0.6,"land":2.5,"paxfee":7,"tax":5,"taxi":0,"country":"IR","rank":null,"pax":9.0,"region":"Nahost"},"CMB":{"name":"Colombo","lat":7.18,"lon":79.88,"pop":5.0,"income":0.12,"biz":0.8,"tour":1.4,"land":3.4,"paxfee":13,"tax":8,"taxi":0,"country":"LK","rank":null,"pax":10.0,"region":"Asien"},"MLE":{"name":"Malé","lat":4.19,"lon":73.53,"pop":0.5,"income":0.4,"biz":0.4,"tour":3.0,"land":4.9,"paxfee":21,"tax":15,"taxi":0,"country":"MV","rank":null,"pax":5.0,"region":"Asien"},"KTM":{"name":"Kathmandu","lat":27.7,"lon":85.36,"pop":3.0,"income":0.05,"biz":0.5,"tour":1.5,"land":3.3,"paxfee":10,"tax":5,"taxi":0,"country":"NP","rank":null,"pax":7.0,"region":"Asien"},"DAC":{"name":"Dhaka","lat":23.84,"lon":90.4,"pop":21.0,"income":0.08,"biz":0.8,"tour":0.5,"land":3.4,"paxfee":9,"tax":5,"taxi":0,"country":"BD","rank":null,"pax":12.0,"region":"Asien"},"KHI":{"name":"Karatschi","lat":24.91,"lon":67.16,"pop":17.0,"income":0.06,"biz":0.9,"tour":0.4,"land":3.4,"paxfee":8,"tax":5,"taxi":0,"country":"PK","rank":null,"pax":9.0,"region":"Asien"},"LHE":{"name":"Lahore","lat":31.52,"lon":74.4,"pop":13.0,"income":0.06,"biz":0.7,"tour":0.5,"land":3.3,"paxfee":8,"tax":5,"taxi":0,"country":"PK","rank":null,"pax":6.0,"region":"Asien"},"ISB":{"name":"Islamabad","lat":33.55,"lon":72.83,"pop":2.5,"income":0.06,"biz":0.9,"tour":0.5,"land":3.3,"paxfee":8,"tax":5,"taxi":0,"country":"PK","rank":null,"pax":5.0,"region":"Asien"},"CCU":{"name":"Kolkata","lat":22.65,"lon":88.45,"pop":15.0,"income":0.18,"biz":0.9,"tour":0.8,"land":3.6,"paxfee":7,"tax":4,"taxi":0,"country":"IN","rank":null,"pax":22.0,"region":"Asien"},"MAA":{"name":"Chennai","lat":12.99,"lon":80.17,"pop":11.0,"income":0.18,"biz":1.0,"tour":0.8,"land":3.6,"paxfee":7,"tax":4,"taxi":0,"country":"IN","rank":null,"pax":22.0,"region":"Asien"},"COK":{"name":"Kochi","lat":10.15,"lon":76.4,"pop":3.0,"income":0.18,"biz":0.6,"tour":1.4,"land":3.4,"paxfee":7,"tax":4,"taxi":0,"country":"IN","rank":null,"pax":11.0,"region":"Asien"},"GOI":{"name":"Goa","lat":15.38,"lon":73.83,"pop":1.5,"income":0.18,"biz":0.3,"tour":2.4,"land":3.4,"paxfee":7,"tax":4,"taxi":0,"country":"IN","rank":null,"pax":8.0,"region":"Asien"},"AMD":{"name":"Ahmedabad","lat":23.07,"lon":72.63,"pop":8.0,"income":0.18,"biz":0.9,"tour":0.6,"land":3.4,"paxfee":7,"tax":4,"taxi":0,"country":"IN","rank":null,"pax":12.0,"region":"Asien"},"PNQ":{"name":"Pune","lat":18.58,"lon":73.92,"pop":7.0,"income":0.18,"biz":1.0,"tour":0.6,"land":3.4,"paxfee":7,"tax":4,"taxi":0,"country":"IN","rank":null,"pax":9.0,"region":"Asien"},"HKT":{"name":"Phuket","lat":8.11,"lon":98.31,"pop":0.5,"income":0.35,"biz":0.3,"tour":2.8,"land":3.6,"paxfee":13,"tax":4,"taxi":0,"country":"TH","rank":null,"pax":18.0,"region":"Asien"},"CNX":{"name":"Chiang Mai","lat":18.77,"lon":98.96,"pop":1.2,"income":0.35,"biz":0.4,"tour":2.0,"land":3.4,"paxfee":13,"tax":4,"taxi":0,"country":"TH","rank":null,"pax":8.0,"region":"Asien"},"PEN":{"name":"Penang","lat":5.3,"lon":100.28,"pop":1.8,"income":0.5,"biz":0.8,"tour":1.6,"land":3.4,"paxfee":10,"tax":4,"taxi":0,"country":"MY","rank":null,"pax":8.0,"region":"Asien"},"BKI":{"name":"Kota Kinabalu","lat":5.94,"lon":116.05,"pop":1.0,"income":0.5,"biz":0.5,"tour":1.6,"land":3.4,"paxfee":10,"tax":4,"taxi":0,"country":"MY","rank":null,"pax":9.0,"region":"Asien"},"CEB":{"name":"Cebu","lat":10.31,"lon":123.98,"pop":3.0,"income":0.22,"biz":0.7,"tour":1.8,"land":3.4,"paxfee":10,"tax":4,"taxi":0,"country":"PH","rank":null,"pax":11.0,"region":"Asien"},"DAD":{"name":"Da Nang","lat":16.04,"lon":108.2,"pop":1.2,"income":0.25,"biz":0.5,"tour":2.2,"land":3.5,"paxfee":10,"tax":4,"taxi":0,"country":"VN","rank":null,"pax":14.0,"region":"Asien"},"PQC":{"name":"Phu Quoc","lat":10.17,"lon":103.99,"pop":0.2,"income":0.25,"biz":0.2,"tour":2.6,"land":3.3,"paxfee":10,"tax":4,"taxi":0,"country":"VN","rank":null,"pax":5.0,"region":"Asien"},"PNH":{"name":"Phnom Penh","lat":11.55,"lon":104.84,"pop":2.3,"income":0.08,"biz":0.6,"tour":1.2,"land":3.3,"paxfee":12,"tax":5,"taxi":0,"country":"KH","rank":null,"pax":5.5,"region":"Asien"},"RGN":{"name":"Rangun","lat":16.91,"lon":96.13,"pop":7.0,"income":0.05,"biz":0.5,"tour":0.6,"land":3.3,"paxfee":10,"tax":5,"taxi":0,"country":"MM","rank":null,"pax":5.0,"region":"Asien"},"MFM":{"name":"Macau","lat":22.15,"lon":113.59,"pop":0.7,"income":1.4,"biz":0.8,"tour":2.4,"land":5.0,"paxfee":15,"tax":10,"taxi":0,"country":"MO","rank":null,"pax":7.0,"region":"Asien"},"FUK":{"name":"Fukuoka","lat":33.59,"lon":130.45,"pop":5.0,"income":0.95,"biz":1.0,"tour":1.2,"land":8.3,"paxfee":20,"tax":7,"taxi":0,"country":"JP","rank":null,"pax":24.0,"region":"Asien"},"CTS":{"name":"Sapporo","lat":42.78,"lon":141.69,"pop":2.5,"income":0.95,"biz":0.8,"tour":1.8,"land":8.2,"paxfee":20,"tax":7,"taxi":0,"country":"JP","rank":null,"pax":23.0,"region":"Asien"},"OKA":{"name":"Okinawa","lat":26.2,"lon":127.65,"pop":1.4,"income":0.95,"biz":0.4,"tour":2.4,"land":8.1,"paxfee":20,"tax":7,"taxi":0,"country":"JP","rank":null,"pax":21.0,"region":"Asien"},"NGO":{"name":"Nagoya","lat":34.86,"lon":136.81,"pop":9.0,"income":0.95,"biz":1.2,"tour":0.8,"land":7.6,"paxfee":19,"tax":7,"taxi":0,"country":"JP","rank":null,"pax":10.0,"region":"Asien"},"ITM":{"name":"Osaka-Itami","lat":34.79,"lon":135.44,"pop":10.0,"income":0.95,"biz":1.3,"tour":0.8,"land":7.9,"paxfee":19,"tax":7,"taxi":0,"country":"JP","rank":null,"pax":15.0,"region":"Asien"},"GMP":{"name":"Seoul-Gimpo","lat":37.56,"lon":126.79,"pop":10.0,"income":0.9,"biz":1.2,"tour":0.8,"land":5.5,"paxfee":14,"tax":7,"taxi":0,"country":"KR","rank":null,"pax":24.0,"region":"Asien"},"PUS":{"name":"Busan","lat":35.18,"lon":128.94,"pop":3.4,"income":0.9,"biz":0.9,"tour":1.3,"land":5.2,"paxfee":13,"tax":7,"taxi":0,"country":"KR","rank":null,"pax":15.0,"region":"Asien"},"DLC":{"name":"Dalian","lat":38.97,"lon":121.54,"pop":6.0,"income":0.45,"biz":0.9,"tour":0.9,"land":4.5,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":18.0,"region":"Asien"},"SHE":{"name":"Shenyang","lat":41.64,"lon":123.48,"pop":8.0,"income":0.45,"biz":0.8,"tour":0.6,"land":4.5,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":19.0,"region":"Asien"},"HRB":{"name":"Harbin","lat":45.62,"lon":126.25,"pop":10.0,"income":0.45,"biz":0.7,"tour":1.0,"land":4.5,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":20.0,"region":"Asien"},"TSN":{"name":"Tianjin","lat":39.12,"lon":117.35,"pop":13.0,"income":0.45,"biz":1.0,"tour":0.6,"land":4.5,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":19.0,"region":"Asien"},"CGO":{"name":"Zhengzhou","lat":34.52,"lon":113.84,"pop":12.0,"income":0.45,"biz":0.8,"tour":0.6,"land":4.7,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":28.0,"region":"Asien"},"NNG":{"name":"Nanning","lat":22.61,"lon":108.17,"pop":8.0,"income":0.45,"biz":0.7,"tour":0.9,"land":4.4,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":16.0,"region":"Asien"},"HAK":{"name":"Haikou","lat":19.93,"lon":110.46,"pop":2.5,"income":0.45,"biz":0.5,"tour":2.0,"land":4.6,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":24.0,"region":"Asien"},"SYX":{"name":"Sanya","lat":18.3,"lon":109.41,"pop":1.0,"income":0.45,"biz":0.3,"tour":2.8,"land":4.5,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":22.0,"region":"Asien"},"FOC":{"name":"Fuzhou","lat":25.93,"lon":119.66,"pop":7.0,"income":0.45,"biz":0.8,"tour":0.8,"land":4.4,"paxfee":10,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":15.0,"region":"Asien"},"URC":{"name":"Ürümqi","lat":43.91,"lon":87.47,"pop":4.0,"income":0.45,"biz":0.7,"tour":1.0,"land":4.6,"paxfee":11,"tax":6,"taxi":0,"country":"CN","rank":null,"pax":25.0,"region":"Asien"},"ULN":{"name":"Ulaanbaatar","lat":47.65,"lon":106.82,"pop":1.6,"income":0.15,"biz":0.6,"tour":0.9,"land":4.1,"paxfee":12,"tax":5,"taxi":0,"country":"MN","rank":null,"pax":2.4,"region":"Asien"},"ALA":{"name":"Almaty","lat":43.35,"lon":77.04,"pop":2.2,"income":0.35,"biz":0.9,"tour":0.8,"land":3.4,"paxfee":10,"tax":5,"taxi":0,"country":"KZ","rank":null,"pax":9.0,"region":"Asien"},"NQZ":{"name":"Astana","lat":51.02,"lon":71.47,"pop":1.4,"income":0.35,"biz":1.0,"tour":0.5,"land":3.3,"paxfee":10,"tax":5,"taxi":0,"country":"KZ","rank":null,"pax":6.0,"region":"Asien"},"TAS":{"name":"Taschkent","lat":41.26,"lon":69.28,"pop":3.0,"income":0.08,"biz":0.7,"tour":0.8,"land":3.3,"paxfee":10,"tax":5,"taxi":0,"country":"UZ","rank":null,"pax":6.0,"region":"Asien"},"GYD":{"name":"Baku","lat":40.47,"lon":50.05,"pop":2.5,"income":0.2,"biz":0.9,"tour":0.9,"land":3.3,"paxfee":12,"tax":5,"taxi":0,"country":"AZ","rank":null,"pax":5.0,"region":"Asien"},"TBS":{"name":"Tiflis","lat":41.67,"lon":44.95,"pop":1.2,"income":0.2,"biz":0.6,"tour":1.3,"land":3.3,"paxfee":12,"tax":5,"taxi":0,"country":"GE","rank":null,"pax":4.0,"region":"Asien"},"EVN":{"name":"Jerewan","lat":40.15,"lon":44.4,"pop":1.1,"income":0.2,"biz":0.6,"tour":1.0,"land":3.3,"paxfee":12,"tax":5,"taxi":0,"country":"AM","rank":null,"pax":5.0,"region":"Asien"},"HNL":{"name":"Honolulu","lat":21.32,"lon":-157.92,"pop":1.0,"income":1.35,"biz":0.6,"tour":2.8,"land":3.6,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":null,"pax":21.0,"region":"Nordamerika"},"OGG":{"name":"Maui","lat":20.9,"lon":-156.43,"pop":0.17,"income":1.35,"biz":0.3,"tour":3.0,"land":3.3,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":7.0,"region":"Nordamerika"},"ANC":{"name":"Anchorage","lat":61.17,"lon":-149.99,"pop":0.4,"income":1.35,"biz":0.8,"tour":1.4,"land":3.3,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":5.5,"region":"Nordamerika"},"AUS":{"name":"Austin","lat":30.19,"lon":-97.67,"pop":2.4,"income":1.35,"biz":1.3,"tour":1.0,"land":3.6,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":null,"pax":22.0,"region":"Nordamerika"},"BNA":{"name":"Nashville","lat":36.12,"lon":-86.68,"pop":2.0,"income":1.35,"biz":1.1,"tour":1.4,"land":3.7,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":null,"pax":24.0,"region":"Nordamerika"},"MSY":{"name":"New Orleans","lat":29.99,"lon":-90.26,"pop":1.3,"income":1.35,"biz":0.8,"tour":2.0,"land":3.5,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":14.0,"region":"Nordamerika"},"SAT":{"name":"San Antonio","lat":29.53,"lon":-98.47,"pop":2.6,"income":1.35,"biz":0.8,"tour":1.1,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":10.0,"region":"Nordamerika"},"STL":{"name":"St. Louis","lat":38.75,"lon":-90.37,"pop":2.8,"income":1.35,"biz":1.0,"tour":0.7,"land":3.5,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":15.0,"region":"Nordamerika"},"MCI":{"name":"Kansas City","lat":39.3,"lon":-94.71,"pop":2.2,"income":1.35,"biz":0.9,"tour":0.6,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":11.0,"region":"Nordamerika"},"PDX":{"name":"Portland","lat":45.59,"lon":-122.6,"pop":2.5,"income":1.35,"biz":1.1,"tour":1.0,"land":3.6,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":18.0,"region":"Nordamerika"},"SJC":{"name":"San José","lat":37.36,"lon":-121.93,"pop":2.0,"income":1.35,"biz":1.6,"tour":0.6,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":11.0,"region":"Nordamerika"},"OAK":{"name":"Oakland","lat":37.72,"lon":-122.22,"pop":2.5,"income":1.35,"biz":0.9,"tour":0.7,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":11.0,"region":"Nordamerika"},"SMF":{"name":"Sacramento","lat":38.7,"lon":-121.59,"pop":2.4,"income":1.35,"biz":0.9,"tour":0.6,"land":3.5,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":13.0,"region":"Nordamerika"},"SNA":{"name":"Orange County","lat":33.68,"lon":-117.87,"pop":3.2,"income":1.35,"biz":1.1,"tour":1.1,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":11.0,"region":"Nordamerika"},"RDU":{"name":"Raleigh-Durham","lat":35.88,"lon":-78.79,"pop":2.0,"income":1.35,"biz":1.1,"tour":0.6,"land":3.5,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":14.0,"region":"Nordamerika"},"MDW":{"name":"Chicago-Midway","lat":41.79,"lon":-87.75,"pop":4.0,"income":1.35,"biz":0.8,"tour":0.7,"land":3.6,"paxfee":13,"tax":18,"taxi":0,"country":"US","rank":null,"pax":22.0,"region":"Nordamerika"},"DAL":{"name":"Dallas-Love","lat":32.85,"lon":-96.85,"pop":4.0,"income":1.35,"biz":1.0,"tour":0.6,"land":3.5,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":16.0,"region":"Nordamerika"},"HOU":{"name":"Houston-Hobby","lat":29.65,"lon":-95.28,"pop":3.0,"income":1.35,"biz":0.8,"tour":0.6,"land":3.5,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":13.0,"region":"Nordamerika"},"CLE":{"name":"Cleveland","lat":41.41,"lon":-81.85,"pop":2.0,"income":1.35,"biz":0.9,"tour":0.5,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":10.0,"region":"Nordamerika"},"PIT":{"name":"Pittsburgh","lat":40.49,"lon":-80.23,"pop":2.3,"income":1.35,"biz":1.0,"tour":0.6,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":10.0,"region":"Nordamerika"},"IND":{"name":"Indianapolis","lat":39.72,"lon":-86.29,"pop":2.0,"income":1.35,"biz":0.9,"tour":0.5,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":9.5,"region":"Nordamerika"},"CMH":{"name":"Columbus","lat":39.99,"lon":-82.89,"pop":2.1,"income":1.35,"biz":0.9,"tour":0.5,"land":3.4,"paxfee":12,"tax":18,"taxi":0,"country":"US","rank":null,"pax":9.5,"region":"Nordamerika"},"SJU":{"name":"San Juan","lat":18.44,"lon":-66.0,"pop":2.5,"income":0.7,"biz":0.7,"tour":2.0,"land":3.5,"paxfee":12,"tax":18,"taxi":0,"country":"PR","rank":null,"pax":13.0,"region":"Lateinamerika"},"PUJ":{"name":"Punta Cana","lat":18.57,"lon":-68.36,"pop":0.2,"income":0.3,"biz":0.2,"tour":3.0,"land":4.2,"paxfee":17,"tax":15,"taxi":0,"country":"DO","rank":null,"pax":9.0,"region":"Lateinamerika"},"SDQ":{"name":"Santo Domingo","lat":18.43,"lon":-69.67,"pop":3.5,"income":0.3,"biz":0.6,"tour":1.2,"land":4.1,"paxfee":16,"tax":15,"taxi":0,"country":"DO","rank":null,"pax":5.0,"region":"Lateinamerika"},"MBJ":{"name":"Montego Bay","lat":18.5,"lon":-77.91,"pop":0.3,"income":0.2,"biz":0.2,"tour":2.8,"land":4.1,"paxfee":21,"tax":15,"taxi":0,"country":"JM","rank":null,"pax":5.0,"region":"Lateinamerika"},"NAS":{"name":"Nassau","lat":25.04,"lon":-77.47,"pop":0.3,"income":0.9,"biz":0.5,"tour":2.6,"land":4.9,"paxfee":25,"tax":20,"taxi":0,"country":"BS","rank":null,"pax":4.5,"region":"Lateinamerika"},"HAV":{"name":"Havanna","lat":22.99,"lon":-82.41,"pop":2.1,"income":0.1,"biz":0.4,"tour":1.8,"land":4.1,"paxfee":16,"tax":15,"taxi":0,"country":"CU","rank":null,"pax":3.0,"region":"Lateinamerika"},"SJO":{"name":"San José (Costa Rica)","lat":9.99,"lon":-84.2,"pop":2.2,"income":0.4,"biz":0.7,"tour":1.8,"land":4.1,"paxfee":21,"tax":15,"taxi":0,"country":"CR","rank":null,"pax":6.0,"region":"Lateinamerika"},"LIR":{"name":"Liberia (Costa Rica)","lat":10.59,"lon":-85.54,"pop":0.2,"income":0.4,"biz":0.2,"tour":2.6,"land":4.1,"paxfee":20,"tax":15,"taxi":0,"country":"CR","rank":null,"pax":2.0,"region":"Lateinamerika"},"GUA":{"name":"Guatemala-Stadt","lat":14.58,"lon":-90.53,"pop":3.0,"income":0.18,"biz":0.7,"tour":0.9,"land":3.3,"paxfee":16,"tax":10,"taxi":0,"country":"GT","rank":null,"pax":3.0,"region":"Lateinamerika"},"SAL":{"name":"San Salvador","lat":13.44,"lon":-89.06,"pop":2.0,"income":0.15,"biz":0.6,"tour":0.8,"land":3.3,"paxfee":16,"tax":10,"taxi":0,"country":"SV","rank":null,"pax":4.0,"region":"Lateinamerika"},"AUA":{"name":"Aruba","lat":12.5,"lon":-70.02,"pop":0.1,"income":0.9,"biz":0.3,"tour":3.0,"land":4.9,"paxfee":24,"tax":15,"taxi":0,"country":"AW","rank":null,"pax":2.6,"region":"Lateinamerika"},"BGI":{"name":"Barbados","lat":13.07,"lon":-59.49,"pop":0.3,"income":0.6,"biz":0.4,"tour":2.6,"land":4.9,"paxfee":24,"tax":15,"taxi":0,"country":"BB","rank":null,"pax":2.4,"region":"Lateinamerika"},"GDL":{"name":"Guadalajara","lat":20.52,"lon":-103.31,"pop":5.3,"income":0.52,"biz":0.9,"tour":1.0,"land":4.4,"paxfee":22,"tax":15,"taxi":0,"country":"MX","rank":null,"pax":17.0,"region":"Lateinamerika"},"MTY":{"name":"Monterrey","lat":25.78,"lon":-100.11,"pop":5.3,"income":0.52,"biz":1.2,"tour":0.6,"land":4.3,"paxfee":22,"tax":15,"taxi":0,"country":"MX","rank":null,"pax":12.0,"region":"Lateinamerika"},"TIJ":{"name":"Tijuana","lat":32.54,"lon":-116.97,"pop":2.2,"income":0.52,"biz":0.6,"tour":0.6,"land":4.3,"paxfee":22,"tax":15,"taxi":0,"country":"MX","rank":null,"pax":12.0,"region":"Lateinamerika"},"SJD":{"name":"Los Cabos","lat":23.15,"lon":-109.72,"pop":0.4,"income":0.52,"biz":0.3,"tour":2.8,"land":4.2,"paxfee":21,"tax":15,"taxi":0,"country":"MX","rank":null,"pax":7.0,"region":"Lateinamerika"},"PVR":{"name":"Puerto Vallarta","lat":20.68,"lon":-105.25,"pop":0.5,"income":0.52,"biz":0.3,"tour":2.6,"land":4.1,"paxfee":21,"tax":15,"taxi":0,"country":"MX","rank":null,"pax":6.0,"region":"Lateinamerika"},"CCS":{"name":"Caracas","lat":10.6,"lon":-66.99,"pop":5.0,"income":0.1,"biz":0.6,"tour":0.6,"land":3.3,"paxfee":12,"tax":10,"taxi":0,"country":"VE","rank":null,"pax":3.0,"region":"Lateinamerika"},"TNG":{"name":"Tanger","lat":35.73,"lon":-5.92,"pop":1.2,"income":0.22,"biz":0.5,"tour":1.4,"land":3.2,"paxfee":11,"tax":5,"taxi":0,"country":"MA","rank":null,"pax":2.5,"region":"Afrika"}};
  const AIRPORT_X_DATA = {"ATL":{"cost":1.68,"fuel":0.95,"hand":1.43,"slots":null,"slotFee":0},"DXB":{"cost":1.68,"fuel":0.9,"hand":1.27,"slots":8,"slotFee":150},"HND":{"cost":1.96,"fuel":1.05,"hand":1.51,"slots":4,"slotFee":300},"DFW":{"cost":1.65,"fuel":0.95,"hand":1.35,"slots":null,"slotFee":0},"PVG":{"cost":1.23,"fuel":1.05,"hand":0.98,"slots":8,"slotFee":120},"ORD":{"cost":1.64,"fuel":0.95,"hand":1.35,"slots":null,"slotFee":0},"LHR":{"cost":2.0,"fuel":1.06,"hand":1.3,"slots":4,"slotFee":400},"IST":{"cost":1.09,"fuel":1.0,"hand":0.98,"slots":8,"slotFee":100},"CAN":{"cost":1.22,"fuel":1.05,"hand":0.98,"slots":8,"slotFee":100},"DEN":{"cost":1.62,"fuel":0.95,"hand":1.33,"slots":null,"slotFee":0},"DEL":{"cost":0.79,"fuel":1.2,"hand":0.71,"slots":8,"slotFee":80},"ICN":{"cost":1.29,"fuel":1.03,"hand":1.05,"slots":8,"slotFee":100},"LAX":{"cost":1.55,"fuel":0.95,"hand":1.29,"slots":null,"slotFee":0},"CDG":{"cost":1.5,"fuel":1.03,"hand":1.15,"slots":8,"slotFee":150},"PEK":{"cost":1.15,"fuel":1.05,"hand":0.92,"slots":6,"slotFee":150},"SIN":{"cost":1.77,"fuel":1.0,"hand":1.26,"slots":8,"slotFee":150},"AMS":{"cost":1.4,"fuel":1.02,"hand":1.1,"slots":6,"slotFee":150},"MAD":{"cost":1.25,"fuel":1.03,"hand":1.08,"slots":8,"slotFee":120},"SZX":{"cost":1.12,"fuel":1.05,"hand":0.9,"slots":8,"slotFee":80},"KUL":{"cost":0.85,"fuel":1.0,"hand":0.78,"slots":10,"slotFee":60},"FRA":{"cost":1.3,"fuel":1.02,"hand":1.1,"slots":6,"slotFee":150},"BKK":{"cost":0.85,"fuel":1.03,"hand":0.78,"slots":8,"slotFee":100},"JFK":{"cost":1.46,"fuel":0.95,"hand":1.23,"slots":6,"slotFee":300},"HKG":{"cost":1.81,"fuel":1.03,"hand":1.33,"slots":6,"slotFee":200},"MCO":{"cost":1.42,"fuel":0.95,"hand":1.2,"slots":null,"slotFee":0},"BCN":{"cost":1.0,"fuel":1.03,"hand":0.95,"slots":null,"slotFee":0},"TFU":{"cost":1.06,"fuel":1.05,"hand":0.87,"slots":null,"slotFee":0},"BOM":{"cost":0.7,"fuel":1.2,"hand":0.65,"slots":4,"slotFee":100},"MIA":{"cost":1.4,"fuel":0.95,"hand":1.18,"slots":null,"slotFee":0},"LAS":{"cost":1.4,"fuel":0.95,"hand":1.18,"slots":null,"slotFee":0},"CGK":{"cost":0.7,"fuel":1.08,"hand":0.64,"slots":8,"slotFee":60},"SFO":{"cost":1.4,"fuel":0.95,"hand":1.18,"slots":null,"slotFee":0},"DOH":{"cost":1.39,"fuel":0.9,"hand":1.07,"slots":10,"slotFee":100},"CLT":{"cost":1.39,"fuel":0.95,"hand":1.18,"slots":null,"slotFee":0},"PKX":{"cost":1.04,"fuel":1.05,"hand":0.86,"slots":10,"slotFee":80},"JED":{"cost":1.15,"fuel":0.85,"hand":0.96,"slots":null,"slotFee":0},"SEA":{"cost":1.38,"fuel":0.95,"hand":1.17,"slots":null,"slotFee":0},"MNL":{"cost":0.69,"fuel":1.08,"hand":0.64,"slots":6,"slotFee":80},"PHX":{"cost":1.38,"fuel":0.95,"hand":1.17,"slots":null,"slotFee":0},"FCO":{"cost":1.1,"fuel":1.03,"hand":1.0,"slots":null,"slotFee":0},"HGH":{"cost":1.02,"fuel":1.05,"hand":0.84,"slots":null,"slotFee":0},"SHA":{"cost":1.02,"fuel":1.05,"hand":0.84,"slots":4,"slotFee":150},"CKG":{"cost":1.02,"fuel":1.05,"hand":0.84,"slots":null,"slotFee":0},"KMG":{"cost":1.02,"fuel":1.05,"hand":0.84,"slots":null,"slotFee":0},"XIY":{"cost":1.01,"fuel":1.05,"hand":0.84,"slots":null,"slotFee":0},"SAW":{"cost":0.9,"fuel":1.0,"hand":0.83,"slots":null,"slotFee":0},"IAH":{"cost":1.34,"fuel":0.95,"hand":1.14,"slots":null,"slotFee":0},"TPE":{"cost":1.12,"fuel":1.03,"hand":0.94,"slots":8,"slotFee":80},"YYZ":{"cost":1.22,"fuel":1.0,"hand":1.09,"slots":null,"slotFee":0},"GRU":{"cost":0.89,"fuel":1.1,"hand":0.83,"slots":8,"slotFee":80},"EWR":{"cost":1.35,"fuel":0.95,"hand":1.15,"slots":6,"slotFee":200},"MEX":{"cost":0.88,"fuel":1.05,"hand":0.82,"slots":4,"slotFee":100},"BOG":{"cost":0.77,"fuel":1.1,"hand":0.82,"slots":null,"slotFee":0},"BOS":{"cost":1.3,"fuel":0.95,"hand":1.12,"slots":null,"slotFee":0},"LGW":{"cost":1.41,"fuel":1.06,"hand":1.22,"slots":6,"slotFee":150},"MUC":{"cost":1.3,"fuel":1.02,"hand":1.08,"slots":8,"slotFee":120},"BLR":{"cost":0.64,"fuel":1.2,"hand":0.6,"slots":null,"slotFee":0},"SVO":{"cost":0.96,"fuel":0.95,"hand":0.85,"slots":null,"slotFee":0},"SYD":{"cost":1.4,"fuel":1.05,"hand":1.21,"slots":6,"slotFee":150},"SGN":{"cost":0.64,"fuel":1.05,"hand":0.6,"slots":null,"slotFee":0},"NRT":{"cost":1.47,"fuel":1.05,"hand":1.19,"slots":8,"slotFee":120},"AYT":{"cost":0.84,"fuel":1.0,"hand":0.79,"slots":null,"slotFee":0},"RUH":{"cost":1.05,"fuel":0.85,"hand":0.89,"slots":null,"slotFee":0},"MSP":{"cost":1.26,"fuel":0.95,"hand":1.08,"slots":null,"slotFee":0},"MEL":{"cost":1.36,"fuel":1.05,"hand":1.18,"slots":null,"slotFee":0},"FLL":{"cost":1.24,"fuel":0.95,"hand":1.07,"slots":null,"slotFee":0},"LIS":{"cost":0.85,"fuel":1.04,"hand":0.9,"slots":null,"slotFee":0},"LGA":{"cost":1.22,"fuel":0.95,"hand":1.06,"slots":4,"slotFee":250},"PMI":{"cost":0.9,"fuel":1.05,"hand":0.95,"slots":null,"slotFee":0},"DUB":{"cost":1.12,"fuel":1.03,"hand":0.96,"slots":8,"slotFee":80},"ORY":{"cost":1.33,"fuel":1.03,"hand":1.06,"slots":6,"slotFee":120},"NKG":{"cost":0.91,"fuel":1.05,"hand":0.77,"slots":null,"slotFee":0},"CUN":{"cost":0.81,"fuel":1.05,"hand":0.77,"slots":null,"slotFee":0},"DTW":{"cost":1.22,"fuel":0.95,"hand":1.06,"slots":null,"slotFee":0},"PHL":{"cost":1.22,"fuel":0.95,"hand":1.06,"slots":null,"slotFee":0},"ATH":{"cost":0.91,"fuel":1.04,"hand":0.86,"slots":null,"slotFee":0},"KIX":{"cost":1.41,"fuel":1.05,"hand":1.15,"slots":null,"slotFee":0},"CTU":{"cost":0.91,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"ZRH":{"cost":1.61,"fuel":1.03,"hand":1.24,"slots":6,"slotFee":150},"CSX":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"WUH":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"CAI":{"cost":0.6,"fuel":1.0,"hand":0.66,"slots":null,"slotFee":0},"CPH":{"cost":1.2,"fuel":1.02,"hand":1.04,"slots":null,"slotFee":0},"MAN":{"cost":1.3,"fuel":1.06,"hand":1.14,"slots":null,"slotFee":0},"AUH":{"cost":1.2,"fuel":0.9,"hand":0.94,"slots":null,"slotFee":0},"XMN":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"CJU":{"cost":1.0,"fuel":1.03,"hand":0.85,"slots":null,"slotFee":0},"HAN":{"cost":0.6,"fuel":1.05,"hand":0.57,"slots":null,"slotFee":0},"TAO":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"DMK":{"cost":0.7,"fuel":1.03,"hand":0.66,"slots":null,"slotFee":0},"HYD":{"cost":0.6,"fuel":1.2,"hand":0.57,"slots":null,"slotFee":0},"SLC":{"cost":1.2,"fuel":0.95,"hand":1.03,"slots":null,"slotFee":0},"SCL":{"cost":0.8,"fuel":1.1,"hand":0.79,"slots":null,"slotFee":0},"YVR":{"cost":1.1,"fuel":1.0,"hand":0.98,"slots":null,"slotFee":0},"BWI":{"cost":1.2,"fuel":0.95,"hand":1.03,"slots":null,"slotFee":0},"IAD":{"cost":1.2,"fuel":0.95,"hand":1.02,"slots":null,"slotFee":0},"DCA":{"cost":1.2,"fuel":0.95,"hand":1.02,"slots":4,"slotFee":200},"LIM":{"cost":0.7,"fuel":1.1,"hand":0.74,"slots":null,"slotFee":0},"SAN":{"cost":1.2,"fuel":0.95,"hand":1.02,"slots":null,"slotFee":0},"TPA":{"cost":1.2,"fuel":0.95,"hand":1.02,"slots":null,"slotFee":0},"VIE":{"cost":1.1,"fuel":1.01,"hand":1.0,"slots":null,"slotFee":0},"BER":{"cost":1.0,"fuel":1.0,"hand":1.0,"slots":null,"slotFee":0},"DUS":{"cost":1.1,"fuel":1.0,"hand":1.0,"slots":null,"slotFee":0},"HAM":{"cost":1.0,"fuel":1.0,"hand":1.0,"slots":null,"slotFee":0},"JNB":{"cost":0.75,"fuel":1.05,"hand":0.68,"slots":null,"slotFee":0},"CPT":{"cost":0.75,"fuel":1.05,"hand":0.64,"slots":null,"slotFee":0},"ADD":{"cost":0.55,"fuel":1.1,"hand":0.52,"slots":null,"slotFee":0},"NBO":{"cost":0.6,"fuel":1.12,"hand":0.55,"slots":null,"slotFee":0},"LOS":{"cost":0.7,"fuel":1.25,"hand":0.63,"slots":null,"slotFee":0},"ACC":{"cost":0.65,"fuel":1.2,"hand":0.57,"slots":null,"slotFee":0},"CMN":{"cost":0.6,"fuel":1.05,"hand":0.55,"slots":null,"slotFee":0},"RAK":{"cost":0.6,"fuel":1.05,"hand":0.55,"slots":null,"slotFee":0},"ALG":{"cost":0.6,"fuel":0.9,"hand":0.55,"slots":null,"slotFee":0},"TUN":{"cost":0.6,"fuel":1.0,"hand":0.54,"slots":null,"slotFee":0},"DSS":{"cost":0.6,"fuel":1.15,"hand":0.57,"slots":null,"slotFee":0},"DAR":{"cost":0.55,"fuel":1.15,"hand":0.49,"slots":null,"slotFee":0},"HRG":{"cost":0.6,"fuel":1.0,"hand":0.59,"slots":null,"slotFee":0},"MRU":{"cost":0.8,"fuel":1.1,"hand":0.66,"slots":null,"slotFee":0},"BNE":{"cost":1.3,"fuel":1.05,"hand":1.1,"slots":null,"slotFee":0},"PER":{"cost":1.3,"fuel":1.05,"hand":1.06,"slots":null,"slotFee":0},"ADL":{"cost":1.3,"fuel":1.05,"hand":1.01,"slots":null,"slotFee":0},"OOL":{"cost":1.3,"fuel":1.05,"hand":1.0,"slots":null,"slotFee":0},"CBR":{"cost":1.3,"fuel":1.05,"hand":0.98,"slots":null,"slotFee":0},"CNS":{"cost":1.3,"fuel":1.05,"hand":0.99,"slots":null,"slotFee":0},"HBA":{"cost":1.3,"fuel":1.05,"hand":0.98,"slots":null,"slotFee":0},"DRW":{"cost":1.3,"fuel":1.05,"hand":0.97,"slots":null,"slotFee":0},"TSV":{"cost":1.3,"fuel":1.05,"hand":0.97,"slots":null,"slotFee":0},"NTL":{"cost":1.3,"fuel":1.05,"hand":0.97,"slots":null,"slotFee":0},"MCY":{"cost":1.3,"fuel":1.05,"hand":0.97,"slots":null,"slotFee":0},"LST":{"cost":1.3,"fuel":1.05,"hand":0.97,"slots":null,"slotFee":0},"ASP":{"cost":1.3,"fuel":1.05,"hand":0.96,"slots":null,"slotFee":0},"AKL":{"cost":1.2,"fuel":1.08,"hand":0.98,"slots":null,"slotFee":0},"WLG":{"cost":1.2,"fuel":1.08,"hand":0.91,"slots":null,"slotFee":0},"CHC":{"cost":1.2,"fuel":1.08,"hand":0.92,"slots":null,"slotFee":0},"ZQN":{"cost":1.2,"fuel":1.08,"hand":0.89,"slots":null,"slotFee":0},"NAN":{"cost":0.8,"fuel":1.15,"hand":0.65,"slots":null,"slotFee":0},"NOU":{"cost":1.2,"fuel":1.15,"hand":0.88,"slots":null,"slotFee":0},"PPT":{"cost":1.2,"fuel":1.15,"hand":0.89,"slots":null,"slotFee":0},"POM":{"cost":0.8,"fuel":1.2,"hand":0.65,"slots":null,"slotFee":0},"DPS":{"cost":0.6,"fuel":1.08,"hand":0.54,"slots":null,"slotFee":0},"LED":{"cost":0.9,"fuel":0.95,"hand":0.77,"slots":null,"slotFee":0},"AER":{"cost":0.9,"fuel":0.95,"hand":0.72,"slots":null,"slotFee":0},"KZN":{"cost":0.9,"fuel":0.95,"hand":0.7,"slots":null,"slotFee":0},"SVX":{"cost":0.9,"fuel":0.95,"hand":0.71,"slots":null,"slotFee":0},"OVB":{"cost":0.9,"fuel":0.95,"hand":0.71,"slots":null,"slotFee":0},"IKT":{"cost":0.9,"fuel":0.95,"hand":0.69,"slots":null,"slotFee":0},"VVO":{"cost":0.9,"fuel":0.95,"hand":0.69,"slots":null,"slotFee":0},"KGD":{"cost":0.9,"fuel":0.95,"hand":0.69,"slots":null,"slotFee":0},"UFA":{"cost":0.9,"fuel":0.95,"hand":0.69,"slots":null,"slotFee":0},"KJA":{"cost":0.9,"fuel":0.95,"hand":0.69,"slots":null,"slotFee":0},"KHV":{"cost":0.9,"fuel":0.95,"hand":0.69,"slots":null,"slotFee":0},"MMK":{"cost":0.9,"fuel":0.95,"hand":0.68,"slots":null,"slotFee":0},"YKS":{"cost":0.9,"fuel":0.95,"hand":0.69,"slots":null,"slotFee":0},"MRV":{"cost":0.9,"fuel":0.95,"hand":0.69,"slots":null,"slotFee":0},"DUR":{"cost":0.75,"fuel":1.05,"hand":0.62,"slots":null,"slotFee":0},"ZNZ":{"cost":0.55,"fuel":1.15,"hand":0.49,"slots":null,"slotFee":0},"JRO":{"cost":0.55,"fuel":1.15,"hand":0.48,"slots":null,"slotFee":0},"MBA":{"cost":0.6,"fuel":1.12,"hand":0.53,"slots":null,"slotFee":0},"KGL":{"cost":0.6,"fuel":1.15,"hand":0.52,"slots":null,"slotFee":0},"EBB":{"cost":0.6,"fuel":1.15,"hand":0.53,"slots":null,"slotFee":0},"LUN":{"cost":0.6,"fuel":1.2,"hand":0.52,"slots":null,"slotFee":0},"HRE":{"cost":0.65,"fuel":1.2,"hand":0.56,"slots":null,"slotFee":0},"VFA":{"cost":0.65,"fuel":1.2,"hand":0.56,"slots":null,"slotFee":0},"MPM":{"cost":0.6,"fuel":1.2,"hand":0.52,"slots":null,"slotFee":0},"WDH":{"cost":0.7,"fuel":1.15,"hand":0.6,"slots":null,"slotFee":0},"LAD":{"cost":0.75,"fuel":1.0,"hand":0.65,"slots":null,"slotFee":0},"ABJ":{"cost":0.65,"fuel":1.15,"hand":0.57,"slots":null,"slotFee":0},"DLA":{"cost":0.65,"fuel":1.2,"hand":0.56,"slots":null,"slotFee":0},"ABV":{"cost":0.7,"fuel":1.25,"hand":0.62,"slots":null,"slotFee":0},"SEZ":{"cost":0.9,"fuel":1.15,"hand":0.72,"slots":null,"slotFee":0},"TNR":{"cost":0.6,"fuel":1.2,"hand":0.52,"slots":null,"slotFee":0},"SSH":{"cost":0.6,"fuel":1.0,"hand":0.59,"slots":null,"slotFee":0},"LXR":{"cost":0.6,"fuel":1.0,"hand":0.57,"slots":null,"slotFee":0},"AGA":{"cost":0.6,"fuel":1.05,"hand":0.53,"slots":null,"slotFee":0},"GIG":{"cost":0.8,"fuel":1.1,"hand":0.7,"slots":null,"slotFee":0},"BSB":{"cost":0.8,"fuel":1.1,"hand":0.7,"slots":null,"slotFee":0},"CNF":{"cost":0.8,"fuel":1.1,"hand":0.68,"slots":null,"slotFee":0},"SSA":{"cost":0.8,"fuel":1.1,"hand":0.67,"slots":null,"slotFee":0},"REC":{"cost":0.8,"fuel":1.1,"hand":0.68,"slots":null,"slotFee":0},"FOR":{"cost":0.8,"fuel":1.1,"hand":0.67,"slots":null,"slotFee":0},"POA":{"cost":0.8,"fuel":1.1,"hand":0.67,"slots":null,"slotFee":0},"FLN":{"cost":0.8,"fuel":1.1,"hand":0.66,"slots":null,"slotFee":0},"MAO":{"cost":0.8,"fuel":1.1,"hand":0.65,"slots":null,"slotFee":0},"EZE":{"cost":0.8,"fuel":1.1,"hand":0.69,"slots":null,"slotFee":0},"COR":{"cost":0.8,"fuel":1.1,"hand":0.65,"slots":null,"slotFee":0},"MDZ":{"cost":0.8,"fuel":1.1,"hand":0.65,"slots":null,"slotFee":0},"BRC":{"cost":0.8,"fuel":1.1,"hand":0.65,"slots":null,"slotFee":0},"MVD":{"cost":0.85,"fuel":1.1,"hand":0.69,"slots":null,"slotFee":0},"UIO":{"cost":0.75,"fuel":1.05,"hand":0.66,"slots":null,"slotFee":0},"GYE":{"cost":0.75,"fuel":1.05,"hand":0.66,"slots":null,"slotFee":0},"MDE":{"cost":0.7,"fuel":1.1,"hand":0.68,"slots":null,"slotFee":0},"CTG":{"cost":0.7,"fuel":1.1,"hand":0.66,"slots":null,"slotFee":0},"CLO":{"cost":0.7,"fuel":1.1,"hand":0.66,"slots":null,"slotFee":0},"CUZ":{"cost":0.7,"fuel":1.1,"hand":0.65,"slots":null,"slotFee":0},"ASU":{"cost":0.7,"fuel":1.1,"hand":0.6,"slots":null,"slotFee":0},"VVI":{"cost":0.65,"fuel":1.1,"hand":0.57,"slots":null,"slotFee":0},"PTY":{"cost":0.85,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"YUL":{"cost":1.1,"fuel":1.0,"hand":0.95,"slots":null,"slotFee":0},"YYC":{"cost":1.1,"fuel":1.0,"hand":0.93,"slots":null,"slotFee":0},"YEG":{"cost":1.1,"fuel":1.0,"hand":0.88,"slots":null,"slotFee":0},"YOW":{"cost":1.1,"fuel":1.0,"hand":0.87,"slots":null,"slotFee":0},"YWG":{"cost":1.1,"fuel":1.0,"hand":0.86,"slots":null,"slotFee":0},"YHZ":{"cost":1.1,"fuel":1.0,"hand":0.86,"slots":null,"slotFee":0},"YQB":{"cost":1.1,"fuel":1.0,"hand":0.85,"slots":null,"slotFee":0},"YYJ":{"cost":1.1,"fuel":1.0,"hand":0.85,"slots":null,"slotFee":0},"YXE":{"cost":1.1,"fuel":1.0,"hand":0.85,"slots":null,"slotFee":0},"YQR":{"cost":1.1,"fuel":1.0,"hand":0.85,"slots":null,"slotFee":0},"YYT":{"cost":1.1,"fuel":1.0,"hand":0.85,"slots":null,"slotFee":0},"YXY":{"cost":1.1,"fuel":1.0,"hand":0.84,"slots":null,"slotFee":0},"YZF":{"cost":1.1,"fuel":1.0,"hand":0.84,"slots":null,"slotFee":0},"YFB":{"cost":1.1,"fuel":1.0,"hand":0.84,"slots":null,"slotFee":0},"HAJ":{"cost":1.1,"fuel":1.0,"hand":0.83,"slots":null,"slotFee":0},"STR":{"cost":1.1,"fuel":1.0,"hand":0.84,"slots":null,"slotFee":0},"CGN":{"cost":1.1,"fuel":1.0,"hand":0.85,"slots":null,"slotFee":0},"NUE":{"cost":1.1,"fuel":1.0,"hand":0.82,"slots":null,"slotFee":0},"LEJ":{"cost":1.1,"fuel":1.0,"hand":0.81,"slots":null,"slotFee":0},"BRE":{"cost":1.1,"fuel":1.0,"hand":0.81,"slots":null,"slotFee":0},"BRU":{"cost":1.2,"fuel":1.02,"hand":1.0,"slots":8,"slotFee":100},"CRL":{"cost":1.2,"fuel":1.02,"hand":0.94,"slots":null,"slotFee":0},"OSL":{"cost":1.5,"fuel":1.03,"hand":1.22,"slots":null,"slotFee":0},"BGO":{"cost":1.5,"fuel":1.03,"hand":1.08,"slots":null,"slotFee":0},"ARN":{"cost":1.3,"fuel":1.03,"hand":1.1,"slots":null,"slotFee":0},"GOT":{"cost":1.3,"fuel":1.03,"hand":0.99,"slots":null,"slotFee":0},"HEL":{"cost":1.2,"fuel":1.03,"hand":0.97,"slots":null,"slotFee":0},"BLL":{"cost":1.2,"fuel":1.02,"hand":0.9,"slots":null,"slotFee":0},"WAW":{"cost":0.8,"fuel":1.02,"hand":0.72,"slots":null,"slotFee":0},"KRK":{"cost":0.8,"fuel":1.02,"hand":0.68,"slots":null,"slotFee":0},"GDN":{"cost":0.8,"fuel":1.02,"hand":0.66,"slots":null,"slotFee":0},"PRG":{"cost":0.85,"fuel":1.02,"hand":0.74,"slots":null,"slotFee":0},"BUD":{"cost":0.8,"fuel":1.03,"hand":0.71,"slots":null,"slotFee":0},"OTP":{"cost":0.7,"fuel":1.03,"hand":0.66,"slots":null,"slotFee":0},"SOF":{"cost":0.65,"fuel":1.03,"hand":0.59,"slots":null,"slotFee":0},"VAR":{"cost":0.65,"fuel":1.03,"hand":0.57,"slots":null,"slotFee":0},"BEG":{"cost":0.65,"fuel":1.03,"hand":0.59,"slots":null,"slotFee":0},"ZAG":{"cost":0.8,"fuel":1.04,"hand":0.66,"slots":null,"slotFee":0},"SPU":{"cost":0.8,"fuel":1.04,"hand":0.66,"slots":null,"slotFee":0},"DBV":{"cost":0.8,"fuel":1.04,"hand":0.65,"slots":null,"slotFee":0},"KEF":{"cost":1.4,"fuel":1.1,"hand":1.09,"slots":null,"slotFee":0},"RIX":{"cost":0.75,"fuel":1.03,"hand":0.63,"slots":null,"slotFee":0},"VNO":{"cost":0.75,"fuel":1.03,"hand":0.62,"slots":null,"slotFee":0},"TLL":{"cost":0.8,"fuel":1.03,"hand":0.65,"slots":null,"slotFee":0},"MLA":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"LCA":{"cost":0.9,"fuel":1.05,"hand":0.76,"slots":null,"slotFee":0},"SKG":{"cost":0.9,"fuel":1.04,"hand":0.75,"slots":null,"slotFee":0},"HER":{"cost":0.9,"fuel":1.04,"hand":0.76,"slots":null,"slotFee":0},"RHO":{"cost":0.9,"fuel":1.04,"hand":0.75,"slots":null,"slotFee":0},"CFU":{"cost":0.9,"fuel":1.04,"hand":0.74,"slots":null,"slotFee":0},"MXP":{"cost":1.1,"fuel":1.03,"hand":0.94,"slots":8,"slotFee":80},"LIN":{"cost":1.1,"fuel":1.03,"hand":0.85,"slots":4,"slotFee":120},"BGY":{"cost":1.1,"fuel":1.03,"hand":0.89,"slots":null,"slotFee":0},"VCE":{"cost":1.1,"fuel":1.03,"hand":0.85,"slots":null,"slotFee":0},"NAP":{"cost":1.1,"fuel":1.03,"hand":0.86,"slots":null,"slotFee":0},"CTA":{"cost":1.1,"fuel":1.03,"hand":0.86,"slots":null,"slotFee":0},"PMO":{"cost":1.1,"fuel":1.03,"hand":0.84,"slots":null,"slotFee":0},"BLQ":{"cost":1.1,"fuel":1.03,"hand":0.85,"slots":null,"slotFee":0},"AGP":{"cost":1.0,"fuel":1.03,"hand":0.87,"slots":null,"slotFee":0},"ALC":{"cost":1.0,"fuel":1.03,"hand":0.85,"slots":null,"slotFee":0},"VLC":{"cost":1.0,"fuel":1.03,"hand":0.81,"slots":null,"slotFee":0},"SVQ":{"cost":1.0,"fuel":1.03,"hand":0.8,"slots":null,"slotFee":0},"BIO":{"cost":1.0,"fuel":1.03,"hand":0.79,"slots":null,"slotFee":0},"TFS":{"cost":1.0,"fuel":1.03,"hand":0.82,"slots":null,"slotFee":0},"LPA":{"cost":1.0,"fuel":1.03,"hand":0.83,"slots":null,"slotFee":0},"ACE":{"cost":1.0,"fuel":1.03,"hand":0.8,"slots":null,"slotFee":0},"FUE":{"cost":1.0,"fuel":1.03,"hand":0.79,"slots":null,"slotFee":0},"IBZ":{"cost":1.0,"fuel":1.03,"hand":0.8,"slots":null,"slotFee":0},"OPO":{"cost":0.85,"fuel":1.04,"hand":0.79,"slots":null,"slotFee":0},"FAO":{"cost":0.85,"fuel":1.04,"hand":0.77,"slots":null,"slotFee":0},"FNC":{"cost":0.85,"fuel":1.04,"hand":0.74,"slots":null,"slotFee":0},"NCE":{"cost":1.3,"fuel":1.03,"hand":0.96,"slots":null,"slotFee":0},"MRS":{"cost":1.3,"fuel":1.03,"hand":0.94,"slots":null,"slotFee":0},"LYS":{"cost":1.3,"fuel":1.03,"hand":0.94,"slots":null,"slotFee":0},"TLS":{"cost":1.3,"fuel":1.03,"hand":0.92,"slots":null,"slotFee":0},"BOD":{"cost":1.3,"fuel":1.03,"hand":0.92,"slots":null,"slotFee":0},"NTE":{"cost":1.3,"fuel":1.03,"hand":0.92,"slots":null,"slotFee":0},"GVA":{"cost":1.6,"fuel":1.03,"hand":1.16,"slots":6,"slotFee":120},"BSL":{"cost":1.6,"fuel":1.03,"hand":1.1,"slots":null,"slotFee":0},"STN":{"cost":1.3,"fuel":1.06,"hand":1.13,"slots":6,"slotFee":80},"LTN":{"cost":1.3,"fuel":1.06,"hand":1.06,"slots":null,"slotFee":0},"EDI":{"cost":1.3,"fuel":1.06,"hand":1.04,"slots":null,"slotFee":0},"GLA":{"cost":1.3,"fuel":1.06,"hand":1.0,"slots":null,"slotFee":0},"BHX":{"cost":1.3,"fuel":1.06,"hand":1.03,"slots":null,"slotFee":0},"BRS":{"cost":1.3,"fuel":1.06,"hand":1.01,"slots":null,"slotFee":0},"EIN":{"cost":1.4,"fuel":1.02,"hand":0.92,"slots":null,"slotFee":0},"SZG":{"cost":1.1,"fuel":1.01,"hand":0.81,"slots":null,"slotFee":0},"ADB":{"cost":0.8,"fuel":1.0,"hand":0.69,"slots":null,"slotFee":0},"ESB":{"cost":0.8,"fuel":1.0,"hand":0.69,"slots":null,"slotFee":0},"DLM":{"cost":0.8,"fuel":1.0,"hand":0.66,"slots":null,"slotFee":0},"BJV":{"cost":0.8,"fuel":1.0,"hand":0.66,"slots":null,"slotFee":0},"TLV":{"cost":1.2,"fuel":1.05,"hand":1.0,"slots":8,"slotFee":80},"AMM":{"cost":0.7,"fuel":1.05,"hand":0.63,"slots":null,"slotFee":0},"BEY":{"cost":0.7,"fuel":1.1,"hand":0.63,"slots":null,"slotFee":0},"KWI":{"cost":1.0,"fuel":0.85,"hand":0.79,"slots":null,"slotFee":0},"BAH":{"cost":1.0,"fuel":0.85,"hand":0.76,"slots":null,"slotFee":0},"MCT":{"cost":0.9,"fuel":0.85,"hand":0.74,"slots":null,"slotFee":0},"DMM":{"cost":1.0,"fuel":0.85,"hand":0.77,"slots":null,"slotFee":0},"MED":{"cost":1.0,"fuel":0.85,"hand":0.76,"slots":null,"slotFee":0},"SHJ":{"cost":1.2,"fuel":0.9,"hand":0.89,"slots":null,"slotFee":0},"IKA":{"cost":0.5,"fuel":0.7,"hand":0.46,"slots":null,"slotFee":0},"CMB":{"cost":0.6,"fuel":1.15,"hand":0.51,"slots":null,"slotFee":0},"MLE":{"cost":0.9,"fuel":1.2,"hand":0.74,"slots":null,"slotFee":0},"KTM":{"cost":0.55,"fuel":1.2,"hand":0.46,"slots":null,"slotFee":0},"DAC":{"cost":0.55,"fuel":1.15,"hand":0.47,"slots":null,"slotFee":0},"KHI":{"cost":0.55,"fuel":1.15,"hand":0.46,"slots":null,"slotFee":0},"LHE":{"cost":0.55,"fuel":1.15,"hand":0.46,"slots":null,"slotFee":0},"ISB":{"cost":0.55,"fuel":1.15,"hand":0.45,"slots":null,"slotFee":0},"CCU":{"cost":0.6,"fuel":1.2,"hand":0.55,"slots":null,"slotFee":0},"MAA":{"cost":0.6,"fuel":1.2,"hand":0.55,"slots":null,"slotFee":0},"COK":{"cost":0.6,"fuel":1.2,"hand":0.51,"slots":null,"slotFee":0},"GOI":{"cost":0.6,"fuel":1.2,"hand":0.5,"slots":null,"slotFee":0},"AMD":{"cost":0.6,"fuel":1.2,"hand":0.52,"slots":null,"slotFee":0},"PNQ":{"cost":0.6,"fuel":1.2,"hand":0.51,"slots":null,"slotFee":0},"HKT":{"cost":0.7,"fuel":1.03,"hand":0.62,"slots":null,"slotFee":0},"CNX":{"cost":0.7,"fuel":1.03,"hand":0.59,"slots":null,"slotFee":0},"PEN":{"cost":0.7,"fuel":1.0,"hand":0.59,"slots":null,"slotFee":0},"BKI":{"cost":0.7,"fuel":1.0,"hand":0.59,"slots":null,"slotFee":0},"CEB":{"cost":0.6,"fuel":1.08,"hand":0.51,"slots":null,"slotFee":0},"DAD":{"cost":0.6,"fuel":1.05,"hand":0.52,"slots":null,"slotFee":0},"PQC":{"cost":0.6,"fuel":1.05,"hand":0.49,"slots":null,"slotFee":0},"PNH":{"cost":0.55,"fuel":1.15,"hand":0.5,"slots":null,"slotFee":0},"RGN":{"cost":0.55,"fuel":1.2,"hand":0.45,"slots":null,"slotFee":0},"MFM":{"cost":1.2,"fuel":1.05,"hand":0.92,"slots":null,"slotFee":0},"FUK":{"cost":1.4,"fuel":1.05,"hand":1.1,"slots":6,"slotFee":80},"CTS":{"cost":1.4,"fuel":1.05,"hand":1.1,"slots":null,"slotFee":0},"OKA":{"cost":1.4,"fuel":1.05,"hand":1.09,"slots":null,"slotFee":0},"NGO":{"cost":1.4,"fuel":1.05,"hand":1.02,"slots":null,"slotFee":0},"ITM":{"cost":1.4,"fuel":1.05,"hand":1.05,"slots":4,"slotFee":150},"GMP":{"cost":1.0,"fuel":1.03,"hand":0.83,"slots":6,"slotFee":120},"PUS":{"cost":1.0,"fuel":1.03,"hand":0.79,"slots":null,"slotFee":0},"DLC":{"cost":0.9,"fuel":1.05,"hand":0.71,"slots":null,"slotFee":0},"SHE":{"cost":0.9,"fuel":1.05,"hand":0.72,"slots":null,"slotFee":0},"HRB":{"cost":0.9,"fuel":1.05,"hand":0.72,"slots":null,"slotFee":0},"TSN":{"cost":0.9,"fuel":1.05,"hand":0.72,"slots":null,"slotFee":0},"CGO":{"cost":0.9,"fuel":1.05,"hand":0.75,"slots":null,"slotFee":0},"NNG":{"cost":0.9,"fuel":1.05,"hand":0.7,"slots":null,"slotFee":0},"HAK":{"cost":0.9,"fuel":1.05,"hand":0.74,"slots":null,"slotFee":0},"SYX":{"cost":0.9,"fuel":1.05,"hand":0.73,"slots":null,"slotFee":0},"FOC":{"cost":0.9,"fuel":1.05,"hand":0.7,"slots":null,"slotFee":0},"URC":{"cost":0.9,"fuel":1.05,"hand":0.74,"slots":null,"slotFee":0},"ULN":{"cost":0.6,"fuel":1.2,"hand":0.53,"slots":null,"slotFee":0},"ALA":{"cost":0.65,"fuel":0.95,"hand":0.59,"slots":null,"slotFee":0},"NQZ":{"cost":0.65,"fuel":0.95,"hand":0.58,"slots":null,"slotFee":0},"TAS":{"cost":0.55,"fuel":1.0,"hand":0.5,"slots":null,"slotFee":0},"GYD":{"cost":0.65,"fuel":0.9,"hand":0.58,"slots":null,"slotFee":0},"TBS":{"cost":0.6,"fuel":1.05,"hand":0.53,"slots":null,"slotFee":0},"EVN":{"cost":0.6,"fuel":1.05,"hand":0.54,"slots":null,"slotFee":0},"HNL":{"cost":1.2,"fuel":0.95,"hand":1.0,"slots":null,"slotFee":0},"OGG":{"cost":1.2,"fuel":0.95,"hand":0.92,"slots":null,"slotFee":0},"ANC":{"cost":1.2,"fuel":0.95,"hand":0.91,"slots":null,"slotFee":0},"AUS":{"cost":1.2,"fuel":0.95,"hand":1.0,"slots":null,"slotFee":0},"BNA":{"cost":1.2,"fuel":0.95,"hand":1.01,"slots":null,"slotFee":0},"MSY":{"cost":1.2,"fuel":0.95,"hand":0.96,"slots":null,"slotFee":0},"SAT":{"cost":1.2,"fuel":0.95,"hand":0.94,"slots":null,"slotFee":0},"STL":{"cost":1.2,"fuel":0.95,"hand":0.96,"slots":null,"slotFee":0},"MCI":{"cost":1.2,"fuel":0.95,"hand":0.94,"slots":null,"slotFee":0},"PDX":{"cost":1.2,"fuel":0.95,"hand":0.98,"slots":null,"slotFee":0},"SJC":{"cost":1.2,"fuel":0.95,"hand":0.94,"slots":null,"slotFee":0},"OAK":{"cost":1.2,"fuel":0.95,"hand":0.94,"slots":null,"slotFee":0},"SMF":{"cost":1.2,"fuel":0.95,"hand":0.95,"slots":null,"slotFee":0},"SNA":{"cost":1.2,"fuel":0.95,"hand":0.94,"slots":null,"slotFee":0},"RDU":{"cost":1.2,"fuel":0.95,"hand":0.96,"slots":null,"slotFee":0},"MDW":{"cost":1.2,"fuel":0.95,"hand":1.0,"slots":null,"slotFee":0},"DAL":{"cost":1.2,"fuel":0.95,"hand":0.97,"slots":null,"slotFee":0},"HOU":{"cost":1.2,"fuel":0.95,"hand":0.95,"slots":null,"slotFee":0},"CLE":{"cost":1.2,"fuel":0.95,"hand":0.94,"slots":null,"slotFee":0},"PIT":{"cost":1.2,"fuel":0.95,"hand":0.94,"slots":null,"slotFee":0},"IND":{"cost":1.2,"fuel":0.95,"hand":0.93,"slots":null,"slotFee":0},"CMH":{"cost":1.2,"fuel":0.95,"hand":0.93,"slots":null,"slotFee":0},"SJU":{"cost":1.0,"fuel":1.0,"hand":0.86,"slots":null,"slotFee":0},"PUJ":{"cost":0.75,"fuel":1.1,"hand":0.68,"slots":null,"slotFee":0},"SDQ":{"cost":0.75,"fuel":1.1,"hand":0.66,"slots":null,"slotFee":0},"MBJ":{"cost":0.8,"fuel":1.15,"hand":0.66,"slots":null,"slotFee":0},"NAS":{"cost":1.1,"fuel":1.15,"hand":0.82,"slots":null,"slotFee":0},"HAV":{"cost":0.7,"fuel":1.2,"hand":0.61,"slots":null,"slotFee":0},"SJO":{"cost":0.8,"fuel":1.1,"hand":0.66,"slots":null,"slotFee":0},"LIR":{"cost":0.8,"fuel":1.1,"hand":0.65,"slots":null,"slotFee":0},"GUA":{"cost":0.7,"fuel":1.1,"hand":0.61,"slots":null,"slotFee":0},"SAL":{"cost":0.7,"fuel":1.1,"hand":0.61,"slots":null,"slotFee":0},"AUA":{"cost":1.1,"fuel":1.15,"hand":0.81,"slots":null,"slotFee":0},"BGI":{"cost":1.0,"fuel":1.15,"hand":0.81,"slots":null,"slotFee":0},"GDL":{"cost":0.8,"fuel":1.05,"hand":0.71,"slots":null,"slotFee":0},"MTY":{"cost":0.8,"fuel":1.05,"hand":0.69,"slots":null,"slotFee":0},"TIJ":{"cost":0.8,"fuel":1.05,"hand":0.69,"slots":null,"slotFee":0},"SJD":{"cost":0.8,"fuel":1.05,"hand":0.67,"slots":null,"slotFee":0},"PVR":{"cost":0.8,"fuel":1.05,"hand":0.66,"slots":null,"slotFee":0},"CCS":{"cost":0.6,"fuel":0.8,"hand":0.53,"slots":null,"slotFee":0},"TNG":{"cost":0.6,"fuel":1.05,"hand":0.53,"slots":null,"slotFee":0}};
  const COUNTRY_DATA = {"US":{"dat":"den USA","nom":"USA","region":"Nordamerika","taxLong":40},"CA":{"dat":"Kanada","nom":"Kanada","region":"Nordamerika","taxLong":30},"MX":{"dat":"Mexiko","nom":"Mexiko","region":"Lateinamerika","taxLong":40},"CO":{"dat":"Kolumbien","nom":"Kolumbien","region":"Lateinamerika","taxLong":35},"PE":{"dat":"Peru","nom":"Peru","region":"Lateinamerika","taxLong":30},"CL":{"dat":"Chile","nom":"Chile","region":"Lateinamerika","taxLong":30},"BR":{"dat":"Brasilien","nom":"Brasilien","region":"Lateinamerika","taxLong":25},"GB":{"dat":"Großbritannien","nom":"Großbritannien","region":"Europa","taxLong":95},"FR":{"dat":"Frankreich","nom":"Frankreich","region":"Europa","taxLong":30},"ES":{"dat":"Spanien","nom":"Spanien","region":"Europa","taxLong":0},"IT":{"dat":"Italien","nom":"Italien","region":"Europa","taxLong":7},"PT":{"dat":"Portugal","nom":"Portugal","region":"Europa","taxLong":0},"NL":{"dat":"den Niederlanden","nom":"Niederlande","region":"Europa","taxLong":29},"DE":{"dat":"Deutschland","nom":"Deutschland","region":"Europa","taxLong":60},"AT":{"dat":"Österreich","nom":"Österreich","region":"Europa","taxLong":12},"CH":{"dat":"der Schweiz","nom":"Schweiz","region":"Europa","taxLong":0},"IE":{"dat":"Irland","nom":"Irland","region":"Europa","taxLong":0},"DK":{"dat":"Dänemark","nom":"Dänemark","region":"Europa","taxLong":0},"GR":{"dat":"Griechenland","nom":"Griechenland","region":"Europa","taxLong":0},"TR":{"dat":"der Türkei","nom":"Türkei","region":"Europa","taxLong":10},"RU":{"dat":"Russland","nom":"Russland","region":"Europa","taxLong":0},"AE":{"dat":"den Vereinigten Arabischen Emiraten","nom":"VAE","region":"Nahost","taxLong":10},"QA":{"dat":"Katar","nom":"Katar","region":"Nahost","taxLong":10},"SA":{"dat":"Saudi-Arabien","nom":"Saudi-Arabien","region":"Nahost","taxLong":20},"EG":{"dat":"Ägypten","nom":"Ägypten","region":"Afrika","taxLong":25},"ZA":{"dat":"Südafrika","nom":"Südafrika","region":"Afrika","taxLong":15},"ET":{"dat":"Äthiopien","nom":"Äthiopien","region":"Afrika","taxLong":10},"KE":{"dat":"Kenia","nom":"Kenia","region":"Afrika","taxLong":12},"NG":{"dat":"Nigeria","nom":"Nigeria","region":"Afrika","taxLong":20},"GH":{"dat":"Ghana","nom":"Ghana","region":"Afrika","taxLong":15},"MA":{"dat":"Marokko","nom":"Marokko","region":"Afrika","taxLong":10},"DZ":{"dat":"Algerien","nom":"Algerien","region":"Afrika","taxLong":10},"TN":{"dat":"Tunesien","nom":"Tunesien","region":"Afrika","taxLong":10},"SN":{"dat":"dem Senegal","nom":"Senegal","region":"Afrika","taxLong":15},"TZ":{"dat":"Tansania","nom":"Tansania","region":"Afrika","taxLong":12},"MU":{"dat":"Mauritius","nom":"Mauritius","region":"Afrika","taxLong":15},"IN":{"dat":"Indien","nom":"Indien","region":"Asien","taxLong":8},"CN":{"dat":"China","nom":"China","region":"Asien","taxLong":12},"HK":{"dat":"Hongkong","nom":"Hongkong","region":"Asien","taxLong":15},"TW":{"dat":"Taiwan","nom":"Taiwan","region":"Asien","taxLong":10},"KR":{"dat":"Südkorea","nom":"Südkorea","region":"Asien","taxLong":7},"JP":{"dat":"Japan","nom":"Japan","region":"Asien","taxLong":7},"SG":{"dat":"Singapur","nom":"Singapur","region":"Asien","taxLong":8},"MY":{"dat":"Malaysia","nom":"Malaysia","region":"Asien","taxLong":8},"TH":{"dat":"Thailand","nom":"Thailand","region":"Asien","taxLong":8},"ID":{"dat":"Indonesien","nom":"Indonesien","region":"Asien","taxLong":8},"PH":{"dat":"den Philippinen","nom":"Philippinen","region":"Asien","taxLong":25},"VN":{"dat":"Vietnam","nom":"Vietnam","region":"Asien","taxLong":8},"AU":{"dat":"Australien","nom":"Australien","region":"Ozeanien","taxLong":40},"NZ":{"dat":"Neuseeland","nom":"Neuseeland","region":"Ozeanien","taxLong":20},"FJ":{"dat":"Fidschi","nom":"Fidschi","region":"Ozeanien","taxLong":30},"NC":{"dat":"Neukaledonien","nom":"Neukaledonien","region":"Ozeanien","taxLong":10},"PF":{"dat":"Französisch-Polynesien","nom":"Franz.-Polynesien","region":"Ozeanien","taxLong":10},"PG":{"dat":"Papua-Neuguinea","nom":"Papua-Neuguinea","region":"Ozeanien","taxLong":15},"AR":{"dat":"Argentinien","nom":"Argentinien","region":"Lateinamerika","taxLong":40},"UY":{"dat":"Uruguay","nom":"Uruguay","region":"Lateinamerika","taxLong":30},"EC":{"dat":"Ecuador","nom":"Ecuador","region":"Lateinamerika","taxLong":30},"PY":{"dat":"Paraguay","nom":"Paraguay","region":"Lateinamerika","taxLong":20},"BO":{"dat":"Bolivien","nom":"Bolivien","region":"Lateinamerika","taxLong":20},"PA":{"dat":"Panama","nom":"Panama","region":"Lateinamerika","taxLong":40},"AO":{"dat":"Angola","nom":"Angola","region":"Afrika","taxLong":20},"RW":{"dat":"Ruanda","nom":"Ruanda","region":"Afrika","taxLong":15},"UG":{"dat":"Uganda","nom":"Uganda","region":"Afrika","taxLong":15},"ZM":{"dat":"Sambia","nom":"Sambia","region":"Afrika","taxLong":15},"ZW":{"dat":"Simbabwe","nom":"Simbabwe","region":"Afrika","taxLong":15},"MZ":{"dat":"Mosambik","nom":"Mosambik","region":"Afrika","taxLong":15},"NA":{"dat":"Namibia","nom":"Namibia","region":"Afrika","taxLong":15},"CI":{"dat":"der Elfenbeinküste","nom":"Elfenbeinküste","region":"Afrika","taxLong":20},"CM":{"dat":"Kamerun","nom":"Kamerun","region":"Afrika","taxLong":20},"SC":{"dat":"den Seychellen","nom":"Seychellen","region":"Afrika","taxLong":15},"MG":{"dat":"Madagaskar","nom":"Madagaskar","region":"Afrika","taxLong":15},"BE":{"dat":"Belgien","nom":"Belgien","region":"Europa","taxLong":10},"NO":{"dat":"Norwegen","nom":"Norwegen","region":"Europa","taxLong":8},"SE":{"dat":"Schweden","nom":"Schweden","region":"Europa","taxLong":25},"FI":{"dat":"Finnland","nom":"Finnland","region":"Europa","taxLong":0},"PL":{"dat":"Polen","nom":"Polen","region":"Europa","taxLong":0},"CZ":{"dat":"Tschechien","nom":"Tschechien","region":"Europa","taxLong":0},"HU":{"dat":"Ungarn","nom":"Ungarn","region":"Europa","taxLong":5},"RO":{"dat":"Rumänien","nom":"Rumänien","region":"Europa","taxLong":0},"BG":{"dat":"Bulgarien","nom":"Bulgarien","region":"Europa","taxLong":0},"RS":{"dat":"Serbien","nom":"Serbien","region":"Europa","taxLong":0},"HR":{"dat":"Kroatien","nom":"Kroatien","region":"Europa","taxLong":0},"IS":{"dat":"Island","nom":"Island","region":"Europa","taxLong":0},"LV":{"dat":"Lettland","nom":"Lettland","region":"Europa","taxLong":0},"LT":{"dat":"Litauen","nom":"Litauen","region":"Europa","taxLong":0},"EE":{"dat":"Estland","nom":"Estland","region":"Europa","taxLong":0},"MT":{"dat":"Malta","nom":"Malta","region":"Europa","taxLong":0},"CY":{"dat":"Zypern","nom":"Zypern","region":"Europa","taxLong":0},"IL":{"dat":"Israel","nom":"Israel","region":"Nahost","taxLong":15},"JO":{"dat":"Jordanien","nom":"Jordanien","region":"Nahost","taxLong":25},"LB":{"dat":"dem Libanon","nom":"Libanon","region":"Nahost","taxLong":25},"KW":{"dat":"Kuwait","nom":"Kuwait","region":"Nahost","taxLong":5},"BH":{"dat":"Bahrain","nom":"Bahrain","region":"Nahost","taxLong":5},"OM":{"dat":"dem Oman","nom":"Oman","region":"Nahost","taxLong":10},"IR":{"dat":"dem Iran","nom":"Iran","region":"Nahost","taxLong":10},"LK":{"dat":"Sri Lanka","nom":"Sri Lanka","region":"Asien","taxLong":20},"MV":{"dat":"den Malediven","nom":"Malediven","region":"Asien","taxLong":30},"NP":{"dat":"Nepal","nom":"Nepal","region":"Asien","taxLong":10},"BD":{"dat":"Bangladesch","nom":"Bangladesch","region":"Asien","taxLong":15},"PK":{"dat":"Pakistan","nom":"Pakistan","region":"Asien","taxLong":15},"KH":{"dat":"Kambodscha","nom":"Kambodscha","region":"Asien","taxLong":15},"MM":{"dat":"Myanmar","nom":"Myanmar","region":"Asien","taxLong":10},"MO":{"dat":"Macau","nom":"Macau","region":"Asien","taxLong":10},"MN":{"dat":"der Mongolei","nom":"Mongolei","region":"Asien","taxLong":10},"KZ":{"dat":"Kasachstan","nom":"Kasachstan","region":"Asien","taxLong":10},"UZ":{"dat":"Usbekistan","nom":"Usbekistan","region":"Asien","taxLong":10},"AZ":{"dat":"Aserbaidschan","nom":"Aserbaidschan","region":"Asien","taxLong":10},"GE":{"dat":"Georgien","nom":"Georgien","region":"Asien","taxLong":10},"AM":{"dat":"Armenien","nom":"Armenien","region":"Asien","taxLong":10},"PR":{"dat":"Puerto Rico","nom":"Puerto Rico","region":"Lateinamerika","taxLong":40},"DO":{"dat":"der Dominikanischen Republik","nom":"Dominik. Rep.","region":"Lateinamerika","taxLong":30},"JM":{"dat":"Jamaika","nom":"Jamaika","region":"Lateinamerika","taxLong":30},"BS":{"dat":"den Bahamas","nom":"Bahamas","region":"Lateinamerika","taxLong":30},"CU":{"dat":"Kuba","nom":"Kuba","region":"Lateinamerika","taxLong":25},"CR":{"dat":"Costa Rica","nom":"Costa Rica","region":"Lateinamerika","taxLong":30},"GT":{"dat":"Guatemala","nom":"Guatemala","region":"Lateinamerika","taxLong":25},"SV":{"dat":"El Salvador","nom":"El Salvador","region":"Lateinamerika","taxLong":25},"AW":{"dat":"Aruba","nom":"Aruba","region":"Lateinamerika","taxLong":30},"BB":{"dat":"Barbados","nom":"Barbados","region":"Lateinamerika","taxLong":30},"VE":{"dat":"Venezuela","nom":"Venezuela","region":"Lateinamerika","taxLong":25}};
  const SEASON_DATA = {"PMI":"island","BCN":"sun","FCO":"sun","LIS":"sun","AYT":"island","CJU":"sun","ATH":"sun","CUN":"winter_sun","MCO":"winter_sun","MIA":"winter_sun","FLL":"winter_sun","TPA":"winter_sun","LAS":"city","BKK":"winter_sun","DMK":"winter_sun","DXB":"winter_sun","AUH":"winter_sun","SYD":"sun","MEL":"sun","SAN":"sun","CAI":"winter_sun","HRG":"winter_sun","RAK":"winter_sun","MRU":"winter_sun","CPT":"winter_sun","TUN":"sun","OOL":"sun","HBA":"sun","GIG":"sun","FLN":"sun","AER":"sun","SSH":"winter_sun","LXR":"winter_sun","AGA":"winter_sun","CTG":"winter_sun","HER":"island","RHO":"island","CFU":"island","IBZ":"island","TFS":"winter_sun","LPA":"winter_sun","ACE":"winter_sun","FUE":"winter_sun","FAO":"sun","FNC":"winter_sun","MLA":"sun","LCA":"sun","SPU":"island","DBV":"sun","DLM":"island","BJV":"island","VAR":"island","AGP":"sun","ALC":"sun","NCE":"sun","HKT":"winter_sun","MLE":"winter_sun","PUJ":"winter_sun","MBJ":"winter_sun","NAS":"winter_sun","AUA":"winter_sun","BGI":"winter_sun","SJD":"winter_sun","PVR":"winter_sun","SYX":"winter_sun","OKA":"sun","GOI":"winter_sun","PQC":"winter_sun","KEF":"sun","HNL":"sun","OGG":"sun"};
  const REGION_ORDER = ["Europa", "Nordamerika", "Lateinamerika", "Nahost", "Afrika", "Asien", "Ozeanien"];
  // @@AIRPORTS-END
  const P = {
    VERSION: 'econ-0.4.0',
    AIRPORTS: AIRPORT_DATA,
    AIRPORT_X: AIRPORT_X_DATA,
    REGIONS: Object.fromEntries(REGION_ORDER.map((r) => [r, Object.keys(AIRPORT_DATA).filter((c) => AIRPORT_DATA[c].region === r)])),
    LEISURE_SEASON_PROFILE: SEASON_DATA,
    INTERCONT: 0.6, MIN_ROUTE_KM: 250, LONGHAUL_TAX_KM: 3000,
    // Nachfragemodell (kalibriert an rund 110 realen Märkten und am Aufkommen aller Flughäfen, siehe tripRaw)
    DEMAND: { leisE: -0.8, bizE: -0.6, vfrE: -0.8, intercont: 0.15, border: 0.4, eu: 0.5, big: 0.8, bigLong: 1, bigFrom: 10, overDom: 1.2, overIntl: 2.9, kMax: 6, covN: 8,
      // Anteil der Inlandsreisen, die zu Flughäfen im Spiel führen (Rest: Ziele, die es im Spiel nicht gibt)
      cover: { DE: 0.95, GB: 0.85, FR: 0.8, ES: 0.85, IT: 0.8, PT: 0.95, GR: 0.5, NO: 0.25, SE: 0.4, JP: 0.6, AU: 0.85, NZ: 0.75, US: 0.75, CA: 0.8, MX: 0.75, CN: 0.65, IN: 0.7, BR: 0.75, RU: 0.6, TR: 0.7, KR: 0.8, AR: 0.6, CO: 0.6, ZA: 0.85, SA: 0.5, ID: 0.4, PH: 0.5, MY: 0.6, TH: 0.6, VN: 0.85, EG: 0.8, MA: 0.7 } },
    // Anteil internationaler Reisender (Land, einzelne Flughäfen abweichend); große Flächenländer fliegen vor allem im Inland
    INTL_SHARE: { def: 0.9,
      country: { US: 0.08, CN: 0.08, IN: 0.12, BR: 0.07, RU: 0.15, JP: 0.12, AU: 0.15, CA: 0.25, ID: 0.12, MX: 0.2, AR: 0.15, CO: 0.2, TR: 0.35, SA: 0.4, IR: 0.3, ZA: 0.2, NG: 0.3, PH: 0.3, VN: 0.3, TH: 0.45, MY: 0.45, PK: 0.4, KR: 0.35, CL: 0.4, PE: 0.35, EG: 0.6, NZ: 0.3, NO: 0.5, SE: 0.6, ES: 0.7, IT: 0.65, FR: 0.65, DE: 0.75, GB: 0.85, GR: 0.7, PT: 0.85, KZ: 0.5, UZ: 0.6, EC: 0.4, VE: 0.4, BO: 0.4, KE: 0.6, TZ: 0.6, ET: 0.8, AO: 0.6, DZ: 0.6, MA: 0.8, PG: 0.4, FI: 0.75, AT: 0.95, CH: 0.97, NL: 0.99, BE: 0.99, DK: 0.9, PL: 0.85, CZ: 0.99, HU: 0.99, IE: 0.99, IL: 0.99, AE: 1, QA: 1, SG: 1, HK: 1, TW: 0.95, MO: 1, KW: 1, BH: 1, JO: 1, LB: 1, OM: 0.9, IS: 0.95, MT: 1, CY: 1, LK: 0.98, MV: 0.9, NP: 0.6, BD: 0.6, KH: 0.8, MM: 0.6, MN: 0.6, AZ: 0.9, GE: 0.95, AM: 1, UA: 0.9, RS: 1, HR: 0.9, BG: 0.95, RO: 0.85, LV: 1, LT: 1, EE: 1 },
      ap: { FRA: 0.9, MUC: 0.85, JFK: 0.45, MIA: 0.45, EWR: 0.3, LAX: 0.3, SFO: 0.3, IAD: 0.3, ORD: 0.15, IAH: 0.2, BOS: 0.2, SEA: 0.15, ATL: 0.1, DFW: 0.1, FLL: 0.15, MCO: 0.12, HNL: 0.25, ANC: 0.15, DEN: 0.05, PHL: 0.1, CLT: 0.08,
        NRT: 0.85, KIX: 0.6, HND: 0.25, NGO: 0.3, PVG: 0.35, PEK: 0.2, PKX: 0.15, CAN: 0.2, SZX: 0.1, SYD: 0.4, MEL: 0.3, BNE: 0.18, PER: 0.25, GRU: 0.3, GIG: 0.15, EZE: 0.6, YYZ: 0.5, YVR: 0.4, YUL: 0.5, MEX: 0.35, CUN: 0.7,
        DEL: 0.25, BOM: 0.3, BLR: 0.12, COK: 0.3, SVO: 0.4, LED: 0.25, IST: 0.7, SAW: 0.35, AYT: 0.85, CGK: 0.25, DPS: 0.55, MNL: 0.4, JED: 0.5, RUH: 0.35, ICN: 0.98, GMP: 0.1, CJU: 0.05, PUS: 0.3, BKK: 0.6, HKT: 0.5, KUL: 0.5,
        JNB: 0.35, CPT: 0.3, MAD: 0.75, BCN: 0.75, PMI: 0.85, AGP: 0.9, TFS: 0.75, LPA: 0.6, FCO: 0.6, MXP: 0.85, CTA: 0.2, PMO: 0.15, CDG: 0.9, ORY: 0.5, NCE: 0.6, AKL: 0.5, CAI: 0.9, LOS: 0.4, ADD: 0.9, NBO: 0.7, BOG: 0.35, LIM: 0.45, SCL: 0.5, SGN: 0.35, HAN: 0.35, OSL: 0.5, ARN: 0.7 } },
    // Umsteigeanteil großer Drehkreuze (grob, Vor-Corona bis 2024): zählt nicht zur Nachfrage vor Ort
    HUB_TRANSFER: { ATL: 0.6, DXB: 0.55, DOH: 0.7, IST: 0.45, FRA: 0.5, AMS: 0.37, CDG: 0.3, LHR: 0.3, MUC: 0.38, ZRH: 0.3, VIE: 0.25, HEL: 0.3, CPH: 0.2, SIN: 0.3, HKG: 0.3, ICN: 0.15, NRT: 0.25, DFW: 0.5, ORD: 0.45, DEN: 0.4, CLT: 0.7, IAH: 0.45, MSP: 0.4, DTW: 0.5, SLC: 0.45, PHX: 0.25, SEA: 0.2, SFO: 0.15, LAX: 0.15, JFK: 0.15, EWR: 0.2, MIA: 0.3, YYZ: 0.3, YVR: 0.2, PEK: 0.1, PKX: 0.1, PVG: 0.12, CAN: 0.15, KUL: 0.2, BKK: 0.15, ADD: 0.7, NBO: 0.3, JNB: 0.25, PTY: 0.7, BOG: 0.3, LIM: 0.25, GRU: 0.3, MEX: 0.15, AUH: 0.55, BAH: 0.4, MAD: 0.3, LIS: 0.35, AKL: 0.12, SYD: 0.1, DEL: 0.12, BOM: 0.1, CAI: 0.2, CMN: 0.2, ATH: 0.15, WAW: 0.2, SVO: 0.35, BRU: 0.15, DUB: 0.1, FCO: 0.15, KEF: 0.4, TPE: 0.2, MNL: 0.1, CGK: 0.1, RUH: 0.2, JED: 0.15, MCT: 0.3, AMM: 0.2, KWI: 0.15, PHL: 0.3, IAD: 0.35, ANC: 0.2, HNL: 0.1 },
    // Langstrecke: Fernreisen sind seltener, aber nicht so selten, wie die Schwerkraftformel allein sagt (Kalibrierung an realen Märkten wie FRA–JFK, LHR–JFK, SIN–SYD)
    LONG_WINDOW_H: 22,   // ein Flugzeug auf einem einzigen langen Umlauf pro Tag
    LH_BOOST: 0, LH_FROM_KM: 2500, LH_FULL_KM: 7000,   // zusätzlicher Langstreckenaufschlag (im neuen Modell über den Großmarkt-Aufschlag abgedeckt)
    // Überschall: Nutzenaufschlag je eingesparter Stunde (Geschäftsreisende zahlen für Zeit, Urlauber kaum)
    SST: { bizPerH: 0.9, bizMax: 3.8, leisurePerH: 0.15, leisureMax: 0.6, vfrPerH: 0.05, vfrMax: 0.25 },
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
    // Landverkehr ohne eigene Bahnangabe: bei 300 km fliegen rund 25 %, bei 400 km die Hälfte, ab 600 km fast alle
    SURFACE: { max: 0.9, mid: 420, width: 80,
      island: ['PMI', 'IBZ', 'TFS', 'LPA', 'ACE', 'FUE', 'CTA', 'PMO', 'HER', 'RHO', 'CFU', 'FNC', 'HNL', 'OGG', 'OKA', 'CJU', 'DPS', 'BKI', 'HAK', 'SYX', 'CEB', 'CTS', 'HBA', 'LST', 'CHC', 'ZQN', 'ZNZ'],
      groups: { eu: ['DE', 'FR', 'NL', 'BE', 'CH', 'AT', 'IT', 'ES', 'PT', 'DK', 'SE', 'NO', 'PL', 'CZ', 'HU', 'RO', 'BG', 'RS', 'HR', 'GR', 'LV', 'LT', 'EE', 'TR'], na: ['US', 'CA', 'MX'],
        sea: ['MY', 'TH', 'KH', 'MM', 'VN'], cn: ['CN', 'HK', 'MO'], gulf: ['AE', 'OM', 'SA', 'QA', 'KW', 'BH', 'JO'], sa: ['IN', 'NP', 'BD', 'PK'],
        am: ['AR', 'BR', 'PY', 'UY', 'CL', 'PE', 'BO', 'EC', 'CO', 'VE'], ca: ['GT', 'SV', 'CR', 'PA'], ea: ['KE', 'TZ', 'UG', 'RW'], sf: ['ZA', 'NA', 'ZW', 'ZM', 'MZ'], cau: ['GE', 'AM', 'AZ'] } },
    VFR_TIES: { 'SYD-AKL': 1.6, 'MEL-AKL': 1.5, 'BNE-AKL': 1.5, 'SYD-CHC': 1.3, 'SYD-WLG': 1.3, 'PER-DPS': 1.4, 'SYD-NAN': 1.3, 'YYZ-YUL': 1.2, 'SVO-LED': 1.3, 'LHR-SYD': 1.3, 'LHR-AKL': 1.3, 'LIS-GRU': 1.4, 'LIS-GIG': 1.4, 'MAD-EZE': 1.4, 'CDG-YUL': 1.5, 'CDG-ABJ': 1.5, 'CDG-DLA': 1.4, 'LIS-LAD': 1.6, 'BER-FCO': 1.3, 'DUS-FCO': 1.3, 'FRA-FCO': 1.3, 'MUC-FCO': 1.4, 'LHR-LIS': 1.5, 'CDG-LIS': 1.8, 'DUS-LIS': 1.3, 'LHR-PMI': 1.2, 'BER-VIE': 1.2, 'MUC-VIE': 1.3 },
    ROUTE_DETOUR: 1.05,
    FUEL_USD_KG: 0.88, EURUSD: 1.10,
    FUEL_PASS: { base: 0.10, long: 0.20, ema: 45 },   // Weitergabe von Kerosinsprüngen in den Marktpreis: kurz ~11 %, lang bis 30 % des Anstiegs
    SEGMENTS: ['leisure', 'business', 'vfr'],
    GRAVITY: { leisure: { K: 95, e: -0.2 }, business: { K: 20, e: -0.6 }, vfr: { K: 16, e: -0.5 } },
    GRAVITY_MIN_DIST_KM: 300,
    REF_PRICE_BASE: 50, REF_PRICE_PER_KM: 0.055,
    // Regionalaufschlag: dünne Strecken ab kleinen Flughäfen (ohne Billigflieger-Druck) tragen höhere Durchschnittspreise
    REGIONAL_FARE: { maxPax: 10, bonus: 0.6, fullKm: 900, zeroKm: 2000 },
    // Anlaufrabatt kleiner Flughäfen für neue Strecken von Spielenden: Passagier- und Landeentgelte im ersten Jahr reduziert
    ROUTE_INCENTIVE: { maxPax: 10, share: 0.5, days: 365 },
    // Marktwissen: Wie genau kennen Sie die Nachfrage einer Verbindung? Stufe 0 unbekannt … 4 sehr genau (Unsicherheit als Faktor).
    // Eigene Strecke: Ist-Daten. Wissen veraltet je decay Tage um eine Stufe. analyst: Abschlag auf die Unsicherheit je Fachkraft-Stufe.
    MARKET_INFO: { sigma: [0.45, 0.3, 0.16, 0.09, 0.04], own: 0.05, decay: 365, analyst: [0, 0.25, 0.4, 0.55], scan: [0, 6, 15, 30], studyLv: { small: 2, extended: 3, full: 4 },
      labels: ['unbekannt', 'grob', 'solide', 'gut', 'sehr genau'], max: 600 },
    CHOICE: {
      leisure: { b_price: -3.2, b_freq: 0.25, b_service: 0.30, b_otp: 1.0, b_brand: 0.40, asc_out: -0.20, econ: 0.8 },
      business: { b_price: -1.3, b_freq: 0.85, b_service: 0.60, b_otp: 2.0, b_brand: 0.60, asc_out: 0.20, econ: 1.6 },
      vfr: { b_price: -2.2, b_freq: 0.35, b_service: 0.30, b_otp: 1.0, b_brand: 0.30, asc_out: -0.20, econ: 0.4 },
    },
    BRAND_NEUTRAL: 0.6,
    BRAND_MATURITY: { delay: 60, days: 300 },   // Marke über Neutral, Premiumprodukt und Premiumkabine wirken erst ab Tag 60 und voll nach rund einem Jahr
    NEST_MU: 0.6,
    SUBDAILY_U: 1.6,   // Flüge seltener als täglich: weniger attraktiv (Geschäftsreisende am stärksten)
    INCUMBENT: { share: 0.6, minPot: 60, minSeats: 40, maxFreq: 14, brand: 0.66, otp: 0.82, service: 'standard', priceVsRef: 1.0 },
    INDIRECT: { min_dist_km: 900, price_vs_ref: 1.05, freq: 4, service: 'standard', otp: 0.75, penalty: { leisure: -1.0, business: -1.8, vfr: -1.0 } },
    TRANSFER: { min_dist_km: 400, max_detour: 1.5, discount: 0.80, penalty: { leisure: -0.7, business: -1.3, vfr: -0.7 }, protect: 0.5,
      // Reisezeit: Umweg (km/h) und Umsteigezeit kosten Nutzen; Drehkreuz-Stufen verkürzen das Umsteigen; viele Langstreckenziele machen ein Drehkreuz attraktiver
      kmh: 800, connH: 2.0, connHPerLv: 0.35, timeU: { leisure: 0.06, business: 0.18, vfr: 0.07 }, attrPerLong: 0.02, attrMax: 0.3, feederBonus: 0.3,
      max_detour_2: 1.35, min_dist_2: 2500, twoStop: 1.25 },
    // Streckenrolle: gemischt (Standard), Zubringer (abgestimmt auf Umsteiger, hält Plätze frei) oder Endziel (Punkt zu Punkt, keine Umsteiger)
    ROUTE_ROLE: { mixed: { protect: 0.5, protectMax: 0.5, localU: 0 }, feeder: { protect: 0.9, protectMax: 0.8, localU: -0.08 }, local: { protect: 0, protectMax: 0, localU: 0.08 } },
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
        turn_min: 25, value_eur: 26e6, lease_month: 165e3, dispatch_rel: 0.993, delay_cost_min: 13, acmi_day: 9000, age: 3,
        engines: '2 × Turboprop PW127', note: 'Sparsamster Sitz auf kurzen Strecken, langsam',
        ill: { kind: 'prop', len: 0.68, tt: true, fin: 'atr' } },
      DH8D: { label: 'Dash 8-400', maker: 'De Havilland Canada', cls: 'Schneller Turboprop', group: 'DH8', cabin: 2, seats: { basic: 80, standard: 76, premium: 70 }, range_km: 2000, speed_kmh: 560, mtow_t: 29,
        fuel_cycle_kg: 140, fuel_bh_kg: 900, crew_bh: 460, maint_bh: 380, maint_cycle: 190, handling: 600, cargo_kg: 800,
        turn_min: 25, value_eur: 24e6, lease_month: 120e3, dispatch_rel: 0.989, delay_cost_min: 14, acmi_day: 10500, age: 6,
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
      A21X: { label: 'Airbus A321XLR', maker: 'Airbus', cls: 'Mittelstrecke mit Langstreckenreichweite, neues Muster', group: 'A32F', cabin: 5, seats: { basic: 220, standard: 200, premium: 180 }, range_km: 8700, speed_kmh: 810, mtow_t: 101,
        fuel_cycle_kg: 520, fuel_bh_kg: 2300, crew_bh: 820, maint_bh: 720, maint_cycle: 300, handling: 1300, cargo_kg: 3000,
        turn_min: 45, value_eur: 72e6, lease_month: 480e3, dispatch_rel: 0.995, delay_cost_min: 50, acmi_day: 30000, age: 0, launch: 150,
        engines: '2 × CFM LEAP-1A', note: 'Neues Muster: Schmalrumpf bis 8.700 km – dünne Langstrecken ohne Großraumjet',
        ill: { kind: 'jet', len: 1.0, fin: 'airbus', neo: true } },
      B779: { label: 'Boeing 777-9', maker: 'Boeing', cls: 'Langstrecke, Großraum, neues Muster', group: 'B777', cabin: 12, seats: { basic: 470, standard: 426, premium: 360 }, range_km: 13500, speed_kmh: 860, mtow_t: 351,
        fuel_cycle_kg: 2200, fuel_bh_kg: 6900, crew_bh: 1850, maint_bh: 1500, maint_cycle: 1000, handling: 4900, cargo_kg: 24000,
        turn_min: 95, value_eur: 190e6, lease_month: 1450e3, dispatch_rel: 0.993, delay_cost_min: 150, acmi_day: 110000, age: 0, window: 22, yieldF: 1.08, launch: 330,
        engines: '2 × GE9X', note: 'Neues Muster: größter Zweistrahler, rund 10 % weniger Kerosin je Sitz als die 777-300ER',
        ill: { kind: 'wide', len: 1.05, fin: 'boeing' } },
      // Großraum-Vierstrahler: nicht mehr in Produktion, daher nur Leasing/Gebrauchtmarkt (keine Werksbestellung)
      A388: { label: 'Airbus A380-800', maker: 'Airbus', cls: 'Großraum, doppelstöckig', group: 'A380', cabin: 18, seats: { basic: 615, standard: 520, premium: 470 }, range_km: 15200, speed_kmh: 870, mtow_t: 575,
        fuel_cycle_kg: 3500, fuel_bh_kg: 11200, crew_bh: 2500, maint_bh: 2300, maint_cycle: 1700, handling: 7200, cargo_kg: 20000,
        turn_min: 120, value_eur: 90e6, lease_month: 780e3, dispatch_rel: 0.989, delay_cost_min: 210, acmi_day: 150000, age: 10, window: 22, yieldF: 1.08,
        minAptPax: 25, stock: 2, noFactory: true,
        engines: '4 × Rolls-Royce Trent 900', note: 'Die meisten Sitze je Slot: lohnt sich nur auf sehr dichten Strecken zwischen großen Drehkreuzen und braucht Code-F-Flughäfen (ab 25 Mio. Passagieren im Jahr). Wird nicht mehr gebaut',
        ill: { kind: 'wide', len: 1.08, fin: 'airbus', deck2: true, eng4: true } },
      B748: { label: 'Boeing 747-8 Intercontinental', maker: 'Boeing', cls: 'Großraum, Jumbo', group: 'B747', cabin: 15, seats: { basic: 467, standard: 410, premium: 364 }, range_km: 14300, speed_kmh: 870, mtow_t: 448,
        fuel_cycle_kg: 2900, fuel_bh_kg: 9400, crew_bh: 2200, maint_bh: 2100, maint_cycle: 1500, handling: 5600, cargo_kg: 30000,
        turn_min: 105, value_eur: 70e6, lease_month: 640e3, dispatch_rel: 0.990, delay_cost_min: 180, acmi_day: 125000, age: 10, window: 22, yieldF: 1.08,
        stock: 2, noFactory: true,
        engines: '4 × GEnx-2B67', note: 'Die Königin der Lüfte: viele Sitze, großer Frachtraum, schnellster Unterschall-Jet – aber vier Triebwerke, je Sitz teurer als moderne Zweistrahler. Wird nicht mehr gebaut',
        ill: { kind: 'wide', len: 1.05, fin: 'boeing', hump: true, eng4: true } },
      // Überschall: absichtlich extrem. Fast dreimal so schnell, aber Kerosin und Wartung sprengen jede Kalkulation –
      // lohnt sich nur, wo genug Geschäftsreisende den Zeitgewinn bezahlen. Restaurierte Einzelstücke, nur über den Gebrauchtmarkt.
      CONC: { label: 'Concorde', maker: 'BAC/Aérospatiale', cls: 'Überschall, Prestige', group: 'CONC', cabin: 6, cockpit: 3, seats: { basic: 128, standard: 100, premium: 92 }, range_km: 7200, speed_kmh: 2150, mtow_t: 185,
        fuel_cycle_kg: 5000, fuel_bh_kg: 30000, crew_bh: 2200, maint_bh: 9500, maint_cycle: 6000, handling: 2600, cargo_kg: 1000,
        turn_min: 80, value_eur: 260e6, lease_month: 2.6e6, dispatch_rel: 0.955, delay_cost_min: 90, acmi_day: 260000, age: 5,
        supersonic: true, stock: 0, noFactory: true, maxPerAirline: 2, worldMax: 6, marketWeight: 0.25,
        engines: '4 × Rolls-Royce/Snecma Olympus 593 mit Nachbrenner', note: 'Mach 2: London–New York in gut 3,5 Stunden. Geschäftsreisende zahlen für den Zeitgewinn ein Vielfaches, das Flugzeug bringt Prestige für die Marke – Kerosin, Wartung und Ausfälle sind aber surreal teuer. Auf der falschen Strecke ruiniert sie jede Airline. Restaurierte Einzelstücke, höchstens zwei je Airline',
        ill: { kind: 'sst', len: 0.95 } },
    },
    TYPE_GROUPS: { ATR: 'ATR 72', DH8: 'Dash 8', EJET: 'Embraer E2', A220: 'Airbus A220', A32F: 'Airbus A320-Familie', B737: 'Boeing 737', A330: 'Airbus A330', A350: 'Airbus A350', B787: 'Boeing 787', B777: 'Boeing 777', A380: 'Airbus A380', B747: 'Boeing 747', CONC: 'Concorde' },
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
      pilotSalary: { ATR: 9000, DH8: 9500, EJET: 11500, A220: 13500, A32F: 14500, B737: 14500, A330: 17000, A350: 18000, B787: 17500, B777: 18000, A380: 19500, B747: 19000, CONC: 26000 }, cabinSalary: 4600, techSalary: 6200,
      // Crew nach Blockstunden: Ein Pilot / eine Flugbegleiterin fliegt im Schnitt 3 Blockstunden am Tag
      // (Ruhezeiten, freie Tage, Urlaub, Krankheit – rund 1.100 im Jahr). Je Flugzeug mindestens eine volle Besetzung,
      // Piloten einer Musterfamilie und die Kabine werden über die ganze Flotte gemeinsam eingeplant.
      pilotH: 3, cabinH: 3, techPerAc: 3.5, techMaintShare: 0.12,
      recruit: { pilot: 9000, cabin: 1500, tech: 3500 }, lead: { pilot: 14, cabin: 6, tech: 9 }, leadMaxFactor: 1.5,
      // Arbeitsmarkt je Monat: Obergrenze je Airline und gemeinsamer Bestand (Grundstock plus je menschlicher Airline)
      maxHire: { pilot: 120, cabin: 400, tech: 120 }, marketPool: { pilot: 400, cabin: 1500, tech: 500 }, marketPerAirline: { pilot: 60, cabin: 220, tech: 70 },
      // Gründungsphase: In den ersten Tagen liegen Bewerbungen schon vor – Einstellungen starten schnell
      foundingDays: 60, foundingLead: 5, trainDays: 45, trainCost: 28000,
      agency: 1.6, overtime: 1.5, overtimeMax: 0.10, perDiem: 9, severanceMonths: 3, attrition: 0.01,
    },
    EXPERT_ROLES: {
      analyst: { label: 'Marktanalyse', salary: [7000, 11000, 17000], max: 2,
        effect: ['Prognosen 25 % genauer, bewertet jeden Monat 6 neue Märkte, Streckenstudien möglich', 'Prognosen 40 % genauer, 15 neue Märkte im Monat', 'Prognosen 55 % genauer, 30 neue Märkte im Monat'] },
      revenue: { label: 'Revenue Management', salary: [8000, 13000, 21000], max: 1,
        effect: ['Flex-Tarife: Geschäftsreisende zahlen +8 %', 'Flex-Tarife: Geschäftsreisende zahlen +15 %', 'Flex-Tarife: Geschäftsreisende zahlen +22 %'] },
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
      // Einzigartiger Top-Berater: wirkt in allen Bereichen über Expertenniveau. Es gibt ihn nur einmal pro Welt.
      consultant: { label: 'Top-Beratung', salary: [260000, 260000, 260000, 260000], max: 1, unique: true, signOn: 450000,
        effect: ['', '', '', 'Wirkt in allen acht Bereichen über Expertenniveau: Pünktlichkeit +11 Pkt., Defekte −65 %, Kreditlinie ×2,5, Flex-Tarife +29 %, Kerosin −8 %, Werbung 2,4-fach, Streikrisiko −80 %, Prognosen deutlich genauer'] },
      // Zweiter Einzelberater: etwas schwächer, deutlich günstiger, Spezialist für ältere Flugzeuge.
      fleetadvisor: { label: 'Flotten- und Gebrauchtberatung', salary: [85000, 85000, 85000], max: 1, unique: true, signOn: 120000,
        effect: ['', '', 'Wirkt in allen acht Bereichen auf Expertenniveau. Spezialgebiet Flugzeuge ab 8 Jahren: erkennt den echten Zustand und Marktwert jedes Gebrauchtangebots, verhandelt Gebrauchtkauf und -leasing 10 % günstiger, verkauft eigene ältere Flugzeuge zum vollen Buchwert und bewertet sie im Handel besser'] },
    },
    // Fachkräfte leisten nicht immer, was der Lebenslauf verspricht: Talent (persönlich) + Passung (je Arbeitgeber, neu beim Wechsel),
    // Einarbeitung, monatliche Schwankung, gelegentliche Fehlgriffe und Glücksgriffe. 1 = genau die zugesagte Wirkung.
    EXPERT_PERF: { talentSd: 0.12, fitSd: 0.12, min: 0.45, max: 1.4, rampDays: 30, noiseSd: 0.05, mistakeP: 0.04, mistake: 0.35, luckyP: 0.03, lucky: 1.3, star: [1.02, 1.12] },
    // Schutz gegen Abwerbung: Halteprämie (12 Monate Bindung), Wettbewerbsverbot, Gehalt über Markt
    EXPERT_CONTRACT: { bindDays: 365, bindCost: 3, bindP: 0.35, ncaSalary: 0.15, ncaP: 0.6, ncaComp: 6, ncaWait: 30, raiseMax: 0.3 },
    STAR_CONSULTANT: { id: 'TK', name: 'Tim Kaminski', role: 'consultant', level: 4, years: 31, region: 'Europa', he: true,
      trait: 'der Beste seines Fachs – und das weiß er', prev: 'saniert und baut Airlines seit drei Jahrzehnten' },
    STAR_CONSULTANTS: [
      { id: 'TK', name: 'Tim Kaminski', role: 'consultant', level: 4, years: 31, region: 'Europa', he: true, aiCash: 40e6,
        trait: 'der Beste seines Fachs – und das weiß er', prev: 'saniert und baut Airlines seit drei Jahrzehnten' },
      { id: 'LP', name: 'Luis Perez', role: 'fleetadvisor', level: 3, years: 24, region: 'Lateinamerika', he: true, aiCash: 20e6,
        trait: 'kennt jedes gebrauchte Flugzeug am Markt beim Vornamen', prev: 'Gutachter und Remarketing-Chef bei Leasinggebern' },
    ],
    OLD_AC_AGE: 8,
    STUDY_COST: 25000, STUDY_DAYS: [21, 14, 10], STUDY_ERR: [0.10, 0.05, 0.02],
    // Marktstudien einer externen Beratung: Art × Paket. Preise in EUR (mit Inflation), Dauer in Tagen.
    // cand = untersuchte Kandidaten, top = Vorschläge im Bericht, fares = getestete Tarifstufen (× Referenzpreis), draws = Prognose-Durchläufe
    STUDIES: {
      kinds: {
        routes: { label: 'Streckenanalyse', desc: 'Neue Verbindungen ab Ihren Basen: Nachfrage, Auslastung, Erlöse, Kosten, Wettbewerb und Risiken.' },
        fleet: { label: 'Flugzeugbeschaffung', desc: 'Welche Muster passen zu Ihren Strecken und den besten neuen Märkten – mit Leasing, Kauf und Betriebskosten im Vergleich.' },
        base: { label: 'Standort- und Basisanalyse', desc: 'Wo sich eine neue Basis lohnt: Netzpotenzial, Investition, laufende Kosten, Konkurrenz und Anschlussverbindungen.' },
        gaps: { label: 'Wettbewerb und Marktlücken', desc: 'Wo Nachfrage unbedient ist, wo Konkurrenten voll fliegen oder gut verdienen – und wie Sie auf Ihren Strecken dastehen.' },
      },
      tiers: {
        small: { label: 'Kleine Marktstudie', cost: 35000, days: 4, cand: 30, top: 3, baseCand: 8, fares: [1.0], draws: 1 },
        extended: { label: 'Erweiterte Marktstudie', cost: 140000, days: 9, cand: 80, top: 6, baseCand: 20, fares: [0.9, 1.0, 1.15], draws: 2 },
        full: { label: 'Umfassende Marktanalyse', cost: 420000, days: 16, cand: 160, top: 10, baseCand: 45, fares: [0.85, 1.0, 1.15, 1.3], draws: 3, trend: true },
      },
      maxRunning: 3, keep: 12,
    },
    START_EQUITY_EUR: 20e6, OVERHEAD_PER_AIRCRAFT_DAY: 900.0, STATION_COST_DAY_AI: 600.0,
    // Verwaltungskosten (EUR/Tag) für Spielende: wächst mit der Flotte, kleine Gründungen bleiben bezahlbar
    HQ_CURVE: [[0, 1500], [5, 5000], [15, 12000], [30, 28000], [100, 80000]],
    STAGES: [
      { key: 'startup', label: 'Startup', min: 0, hq: 6000 },
      { key: 'regional', label: 'Regional', min: 6, hq: 12000 },
      { key: 'network', label: 'Netzwerk', min: 26, hq: 30000 },
      { key: 'international', label: 'International', min: 101, hq: 80000 },
    ],
    // Karriere: Spielphasen mit Freischaltungen. need = Bedingungen für den Aufstieg in diese Phase.
    CAREER: {
      startMaxPax: 8,   // Empfehlung für den Start (kein Zwang)
      // Leasing-/Bankkonditionen je Abstand zwischen Phase und Musterklasse: Rate ×, Kaution in Monatsraten, Eigenanteil beim Kauf
      risk: [{ lease: 1, dep: 2, down: 0.2 }, { lease: 1.25, dep: 3, down: 0.3 }, { lease: 1.5, dep: 4, down: 0.4 }, { lease: 1.85, dep: 6, down: 0.55 }, { lease: 2.3, dep: 8, down: 0.7 }],
      levels: [
        { key: 'start', label: 'Gründung', types: ['DH8D'], bases: 1, basePax: 8, hub: 0, acq: 2, ma: false, need: null },
        { key: 'regional', label: 'Regionalairline', types: ['AT76', 'E295'], bases: 2, basePax: 20, hub: 1, acq: 3, ma: false, need: { fleet: 5, days: 90, profit: 1 } },
        { key: 'network', label: 'Netzwerk-Airline', types: ['BCS3', 'A20N', 'A320', 'A21N', 'B738', 'B38M'], bases: 4, basePax: 50, hub: 2, acq: 5, ma: true, need: { fleet: 12, days: 270, profit: 3, equity: 1.0, routes: 8 } },
        { key: 'intercont', label: 'Interkontinental', types: ['A339', 'A359', 'A35K', 'B789', 'B77W', 'B779', 'A21X'], bases: 6, basePax: 999, hub: 3, acq: 8, ma: true, need: { fleet: 25, days: 540, profit: 6, equity: 1.25, pax: 1e6 } },
        { key: 'global', label: 'Global Player', types: 'all', bases: 99, basePax: 999, hub: 3, acq: 99, ma: true, need: { fleet: 50, days: 900, profit: 12, equity: 2, pax: 5e6 } },
      ],
    },
    // Übernahmen (M&A): Kaufpreis = (Eigenkapital + earnX × Jahresgewinn) × premium, mindestens min
    MA: { premium: 1.3, earnX: 4, min: 5e6 },
    // Basen der Spielenden: Einrichtung und laufende Kosten wachsen mit der Größe des Flughafens
    BASE_COST: { setupMin: 150e3, setupK: 30e3, setupExp: 0.8, dayMin: 300, dayK: 70, dayExp: 0.9 },
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
    // Marketing als Anteil am Umsatz mit Sättigung: Wirkung ~ 1 − e^(−Anteil/MKT_SAT)
    MKT_PCT_MAX: 0.08, MKT_SAT: 0.03, MKT_K2: 0.06,
    // Kabinen: Fläche je Sitz (Economy = 1), Preisfaktor auf den Economy-Tarif, Anteil der Geschäftsreisenden, die die Klasse buchen
    CABIN: {
      short: { bizArea: 1.5, firstArea: 0, bizMult: 2.1, firstMult: 0, qBiz: 0.42, qFirst: 0, leisB: 0.012, leisF: 0, costB: 12, costF: 0, maxB: 0.5, maxF: 0 },
      long: { bizArea: 3.4, firstArea: 6, bizMult: 3.4, firstMult: 6.0, qBiz: 0.55, qFirst: 0.10, leisB: 0.025, leisF: 0.004, costB: 70, costF: 220, maxB: 0.7, maxF: 0.3 },
      bizU: 0.25, refit: { short: 120000, long: 600000 },
      ai: { short: { f: 0, b: 0.12 }, long: { f: 0.04, b: 0.26 } },
    },
    LOYALTY: [
      { label: 'Kein Programm', desc: 'Keine Meilen, keine Kosten.' },
      { label: 'Meilenprogramm', desc: 'Meilen sammeln und einlösen', setup: 600000, fixed: 25000, cost: 0.010, partner: 0.004, u: { leisure: 0.03, business: 0.10, vfr: 0.03 } },
      { label: 'Statusprogramm', desc: 'Silber und Gold, Priority, Lounges', setup: 2000000, fixed: 80000, cost: 0.018, partner: 0.008, u: { leisure: 0.06, business: 0.22, vfr: 0.05 } },
      { label: 'Premium-Programm', desc: 'Statusstufen, Kreditkarte, Partner weltweit', setup: 5000000, fixed: 200000, cost: 0.026, partner: 0.012, u: { leisure: 0.09, business: 0.34, vfr: 0.07 } },
    ],
    HUB: [
      { label: 'Basis', desc: 'Umsteigen möglich, aber ohne abgestimmten Flugplan' },
      { label: 'Umsteigeknoten', setup: 1.5e6, monthly: 80000, minRoutes: 4, desc: 'Abgestimmte Anschlüsse, kürzere Umsteigezeit' },
      { label: 'Drehkreuz', setup: 4e6, monthly: 250000, minRoutes: 8, desc: 'Umsteigewellen, Transferschalter, eigenes Gepäcksystem' },
      { label: 'Mega-Hub', setup: 10e6, monthly: 600000, minRoutes: 15, desc: 'Mehrere Wellen am Tag, Lounges, schnelle Wege' },
    ],
    GATE_LOCK: { perMioPax: 900000, monthlyRate: 0.015, maxPax: 25 },
    // 200.000 Pax = 1 Slot; Anteil der etablierten Airlines je Größe (≥40, ≥15, ≥5, ≥1 Mio., kleiner); Slotpreis und Lizenz nach Größe
    SLOT_RULE: { paxPerSlot: 0.2, inc: [0.9, 0.8, 0.6, 0.3, 0], feeBase: 5, feeK: 2, priceBase: 15000, priceExp: 1.2, licenceBase: 10000, licenceExp: 1.1, hubPaxPerSlot: 0.2 },
    SLOT_HOLD_FEE: 1.0,
    PLAYER_AUTO_PRICE: { gain: 0.25, max_step: 0.03, dead: 0.025, max_ref: 3.0, settle_days: 14,
      def: { min: 0, max: 2.0, spd: 0.03, plf: 0 },   // min/max: Faktor auf den Referenzpreis (min 0 = nur Kostengrenze), spd: höchster Schritt je Woche, plf: Ziel-Auslastung Premium (0 = aus)
      lim: { min: [0, 1.5], max: [1.1, 3.0], spd: [0.01, 0.08], plf: [0.5, 0.98] } },
    PREM_PRICE: { min: 0.6, max: 1.6, el: 1.4 },   // Premiumaufschlag je Strecke (1 = Standard), Preiselastizität der Premiumnachfrage
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
  const lv3 = (arr, lv) => {
    if (!(lv > 0)) return arr[0] ?? 0;
    if (lv > 3) return arr[3] + (arr[3] - arr[2]) * (lv - 3);
    const i = Math.floor(lv), f = lv - i;   // Bruchteile: tatsächliche Leistung zwischen zwei Stufen
    return f ? (arr[i] ?? 0) + ((arr[i + 1] ?? arr[i] ?? 0) - (arr[i] ?? 0)) * f : arr[i] ?? 0;
  };
  /** Verborgenes Talent einer Fachkraft (deterministisch aus Name und Kennung, falls nicht gespeichert). */
  function expertTalent(e) {
    if (typeof e.talent === 'number') return e.talent;
    const E = P.EXPERT_PERF, g = new Rng(hashStr('talent:' + e.id + ':' + e.name));
    if (P.EXPERT_ROLES[e.role] && P.EXPERT_ROLES[e.role].unique) return g.range(E.star[0], E.star[1]);
    return clamp(g.gauss(1, E.talentSd), 0.7, 1.25);
  }
  /** Tatsächliche Leistung heute als Anteil der Zusage (Einarbeitung eingerechnet). */
  function expertPerf(e, day) {
    const E = P.EXPERT_PERF, base = e.pm ?? e.perf ?? 1;
    const ramp = e.hiredDay === undefined ? 1 : Math.min(1, 0.6 + 0.4 * Math.max(0, day - e.hiredDay) / E.rampDays);
    return (e.startDay && e.startDay > day) ? 0 : base * ramp;
  }
  /** Fachkraft fängt bei einer Airline an: Passung wird neu ausgewürfelt, Bewertung beginnt von vorn, Vertrag ist neu. */
  function expertJoin(w, e, day) {
    const E = P.EXPERT_PERF, uniq = P.EXPERT_ROLES[e.role] && P.EXPERT_ROLES[e.role].unique;
    e.talent = expertTalent(e);
    const fit = clamp(w.rng.gauss(0, uniq ? 0.04 : E.fitSd), -0.3, 0.3);
    e.perf = clamp(e.talent + fit, E.min, E.max); e.pm = e.perf; e.ps = null; e.psN = 0; e.hiredDay = day;
    delete e.bindUntil; delete e.nca; delete e.expires; delete e.since;
    return e;
  }

  // ===========================================================================
  // Modell
  // ===========================================================================
  const ap = (c) => P.AIRPORTS[c];
  const apx = (c) => P.AIRPORT_X[c];
  /**
   * Slots an jedem Flughafen nach Einzugsgebiet: 200.000 Passagiere im Jahr = 1 Slot (eine tägliche Verbindung), mindestens 1.
   * Den größten Teil halten etablierte Airlines (große Flughäfen fast alles), für simulierte Airlines bleibt der Rest.
   * Slotgebühr je Flug steigt mit der Größe; bisher koordinierte Flughäfen behalten ihre (höheren) Gebühren.
   */
  for (const c of Object.keys(P.AIRPORT_X)) {
    const X = P.AIRPORT_X[c], pax = (P.AIRPORTS[c] && P.AIRPORTS[c].pax) || 0.3, S = P.SLOT_RULE;
    X.coord = X.slots !== null && X.slots !== undefined;
    X.cap = Math.max(1, Math.round(pax / S.paxPerSlot));
    X.incShare = pax >= 40 ? S.inc[0] : pax >= 15 ? S.inc[1] : pax >= 5 ? S.inc[2] : pax >= 1 ? S.inc[3] : S.inc[4];
    X.simCap = Math.max(1, Math.round(X.cap * (1 - X.incShare)));
    X.slots = X.simCap;
    if (!X.slotFee) X.slotFee = Math.round(S.feeBase + S.feeK * pax ** 0.75);
  }
  const _dist = {};   // verschachtelter Cache ohne String-Schlüssel (heißer Pfad)
  function gcDistanceKm(a, b) {
    const ra = _dist[a] || (_dist[a] = {});
    const c = ra[b]; if (c !== undefined) return c;
    const A = ap(a), B = ap(b), R = 6371, rad = Math.PI / 180;
    const p1 = A.lat * rad, p2 = B.lat * rad, dp = p2 - p1, dl = (B.lon - A.lon) * rad;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    const v = 2 * R * Math.asin(Math.sqrt(h));
    ra[b] = v; (_dist[b] || (_dist[b] = {}))[a] = v;
    return v;
  }
  function blockHours(o, d, typeId) {
    const t = P.AIRCRAFT_TYPES[typeId];
    return P.TAXI_BASE_H + ap(o).taxi + ap(d).taxi + P.CLIMB_DESCENT_OVERHEAD_H + gcDistanceKm(o, d) * P.ROUTE_DETOUR / t.speed_kmh;
  }
  // Kerosinzuschlag im Markt: Steigt Kerosin dauerhaft, geben alle Airlines einen Teil weiter – das Preisniveau (Referenzpreis) folgt.
  // Wird von der Welt vor jedem Tag gesetzt (gleitender Kerosinindex); Anteil wächst mit der Distanz (Langstrecke verbraucht mehr).
  let FUEL_X = 0;
  const setFuelX = (w) => { FUEL_X = w && w.macro ? clamp((w.macro.fuelIdx ?? 1) - 1, -0.3, 1.5) : 0; return FUEL_X; };
  const fuelSurShare = (k) => P.FUEL_PASS.base + P.FUEL_PASS.long * Math.min(1, k / 8000);
  /** Aufschlag auf den Referenzpreis für Regionalstrecken: je kleiner der kleinere Flughafen und je kürzer die Strecke, desto höher. */
  function regionalX(o, d, k) {
    const R = P.REGIONAL_FARE; if (!R || k >= R.zeroKm) return 1;
    const small = Math.min(ap(o).pax || 0, ap(d).pax || 0); if (small >= R.maxPax) return 1;
    const s = 1 - small / R.maxPax, t = k <= R.fullKm ? 1 : 1 - (k - R.fullKm) / (R.zeroKm - R.fullKm);
    return 1 + R.bonus * s * t;
  }
  const refPrice = (o, d, cpi = 1) => { const k = gcDistanceKm(o, d); return (P.REF_PRICE_BASE + P.REF_PRICE_PER_KM * k + 0.02 * Math.max(0, k - 4000)) * cpi * (1 + FUEL_X * fuelSurShare(k)) * regionalX(o, d, k); };
  function railTime(o, d) { const v = P.RAIL_TIME_H[o + '-' + d] ?? P.RAIL_TIME_H[d + '-' + o]; return v === undefined ? null : v; }
  function railShare(o, d) {
    const tr = railTime(o, d);
    if (tr === null) return 0;
    const ta = blockHours(o, d, 'A20N') + P.ACCESS_TIME_AIR_H;
    return P.RAIL_SHARE_MAX / (1 + Math.exp(P.RAIL_SHARE_SLOPE * (tr - ta)));
  }
  const _acc = {};
  /** Auto, Bus und Bahn auf kurzen Landstrecken: Anteil, der nicht fliegt (Inseln und Meerengen ausgenommen). */
  const _landGrp = {};
  for (const [gname, cs] of Object.entries(P.SURFACE.groups)) for (const c of cs) _landGrp[c] = gname;
  function surfaceShare(o, d) {
    const A = ap(o), B = ap(d), S = P.SURFACE;
    if (S.island.includes(o) || S.island.includes(d)) return 0;
    if (A.country !== B.country && !(_landGrp[A.country] && _landGrp[A.country] === _landGrp[B.country])) return 0;
    return S.max / (1 + Math.exp((gcDistanceKm(o, d) - S.mid) / S.width));
  }
  const accessibility = (o, d) => { const r = _acc[o] || (_acc[o] = {}); const v = r[d]; return v !== undefined ? v : (r[d] = railTime(o, d) !== null ? 1 - railShare(o, d) : 1 - surfaceShare(o, d)); };
  /**
   * Nachfrage (Reisende je Richtung und Tag, vor Bahn-Abzug) – doppelt beschränktes Schwerkraftmodell:
   * 1) Rohstrom je Segment aus Einwohnern, Einkommen, Geschäft und Tourismus, Distanz (Exponent je Segment),
   *    Grenzen (Inland > EU > andere Länder > anderer Kontinent) und einem Aufschlag für Strecken zwischen großen Märkten.
   * 2) Ausgleichsfaktor je Flughafen: Die Summe aller Ströme entspricht dem realen Aufkommen ohne Umsteiger
   *    (Passagiere × (1 − Umsteigeanteil)), so dass kleine Ferienflughäfen nicht mehr Nachfrage haben als Großstädte.
   */
  function tripRaw(o, d) {
    const A = ap(o), B = ap(d), D = P.DEMAND;
    const dk = gcDistanceKm(o, d), dist = Math.max(dk, P.GRAVITY_MIN_DIST_KM) / 1000;
    const ties = P.VFR_TIES[o + '-' + d] ?? P.VFR_TIES[d + '-' + o] ?? 1.0;
    const lh = 1 + P.LH_BOOST * clamp((dk - P.LH_FROM_KM) / (P.LH_FULL_KM - P.LH_FROM_KM), 0, 1);
    const border = A.country === B.country ? 1 : A.region !== B.region ? D.intercont : EU.has(A.country) && EU.has(B.country) ? D.eu : D.border;
    const g = P.GRAVITY, f = border * lh;
    return {
      leisure: f * g.leisure.K * A.pop ** 0.8 * A.income ** 1.5 * B.tour * B.pop ** 0.2 * dist ** D.leisE,
      business: f * g.business.K * (A.pop * B.pop) ** 0.5 * A.biz * B.biz * A.income ** 0.5 * dist ** D.bizE,
      vfr: f * g.vfr.K * (A.pop * B.pop) ** 0.5 * ties * dist ** D.vfrE,
    };
  }
  /** Reales Aufkommen ohne Umsteiger (Mio. Passagiere im Jahr). */
  const odVolume = (c) => Math.max(0.05, (ap(c).pax || 0.5) * (1 - (P.HUB_TRANSFER[c] || 0)));
  /** Anteil internationaler Reisender am Flughafen (Rest: Inland). */
  const intlShare = (c) => P.INTL_SHARE.ap[c] ?? P.INTL_SHARE.country[ap(c).country] ?? P.INTL_SHARE.def;
  const isDom = (o, d) => ap(o).country === ap(d).country;
  /** Aufschlag für Strecken zwischen zwei großen Märkten, auf Langstrecke stärker (London–New York statt Hamburg–Cusco). */
  function bigPairV(va, vb, dk) {
    const D = P.DEMAND, a = Math.max(0, Math.log(va / D.bigFrom)), b = Math.max(0, Math.log(vb / D.bigFrom));
    return a && b ? Math.exp(D.big * a * b * (1 + D.bigLong * Math.min(1, dk / 6000))) : 1;
  }
  // Inland: Nur ein Teil der Inlandsreisen führt zu Flughäfen, die es im Spiel gibt (wenige Flughäfen im Land = kleiner Teil)
  const _nCty = {}; for (const c of AP_CODES) _nCty[ap(c).country] = (_nCty[ap(c).country] || 0) + 1;
  const domCover = (c) => (_nCty[ap(c).country] || 1) < 2 ? 0 : P.DEMAND.cover[ap(c).country] ?? 1 - Math.exp(-((_nCty[ap(c).country] || 1) - 1) / P.DEMAND.covN);
  const layerVol = (c, dom) => odVolume(c) * (dom ? (1 - intlShare(c)) * domCover(c) : intlShare(c));
  const bigPair = (o, d) => (isDom(o, d) ? 1 : bigPairV(layerVol(o, false), layerVol(d, false), gcDistanceKm(o, d)));
  let _demK = null;
  /**
   * Ausgleichsfaktoren je Flughafen, getrennt für Inland und Ausland (einmal berechnet, deterministisch):
   * Inlandsströme summieren sich zum Inlandsaufkommen, Auslandsströme zum Auslandsaufkommen. Faktoren sind gedeckelt –
   * fehlen im Spiel die Inlandsziele (z. B. Norwegen), bleibt der Rest ungeflogen, statt eine einzige Strecke aufzublähen.
   */
  function demandK() {
    if (_demK) return _demK;
    // schneller Pfad über Felder (gleiche Formeln wie tripRaw, bigPair und accessibility)
    const C = AP_CODES, N = C.length, D = P.DEMAND, g = P.GRAVITY, rad = Math.PI / 180, R = 6371;
    const lat = new Float64Array(N), lon = new Float64Array(N), cl = new Float64Array(N), LO = new Float64Array(N), LD = new Float64Array(N), BO = new Float64Array(N), BD = new Float64Array(N), SP = new Float64Array(N);
    const VD = new Float64Array(N), VI = new Float64Array(N), cty = [], reg = [], eu = [];
    for (let i = 0; i < N; i++) {
      const A = ap(C[i]); lat[i] = A.lat * rad; lon[i] = A.lon * rad; cl[i] = Math.cos(lat[i]);
      LO[i] = A.pop ** 0.8 * A.income ** 1.5; LD[i] = A.tour * A.pop ** 0.2; BO[i] = A.pop ** 0.5 * A.biz * A.income ** 0.5; BD[i] = A.pop ** 0.5 * A.biz; SP[i] = A.pop ** 0.5;
      VD[i] = layerVol(C[i], true); VI[i] = layerVol(C[i], false); cty.push(A.country); reg.push(A.region); eu.push(EU.has(A.country));
    }
    const special = new Set([...Object.keys(P.VFR_TIES), ...Object.keys(P.RAIL_TIME_H)]);
    const pi = [], pj = [], pv = [], pd = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dp = lat[j] - lat[i], dl = lon[j] - lon[i], h = Math.sin(dp / 2) ** 2 + cl[i] * cl[j] * Math.sin(dl / 2) ** 2, dk = 2 * R * Math.asin(Math.sqrt(h));
      if (dk < P.MIN_ROUTE_KM) continue;
      const dom = cty[i] === cty[j];
      let v;
      if (special.has(C[i] + '-' + C[j]) || special.has(C[j] + '-' + C[i])) {
        const a = tripRaw(C[i], C[j]), b = tripRaw(C[j], C[i]);
        v = 0.5 * (a.leisure + b.leisure + a.business + b.business + a.vfr + b.vfr) * bigPair(C[i], C[j]) * accessibility(C[i], C[j]);
      } else {
        const ld = Math.log(Math.max(dk, P.GRAVITY_MIN_DIST_KM) / 1000);
        const lh = 1 + P.LH_BOOST * clamp((dk - P.LH_FROM_KM) / (P.LH_FULL_KM - P.LH_FROM_KM), 0, 1);
        const border = dom ? 1 : reg[i] !== reg[j] ? D.intercont : eu[i] && eu[j] ? D.eu : D.border;
        const leis = g.leisure.K * (LO[i] * LD[j] + LO[j] * LD[i]) * Math.exp(D.leisE * ld);
        const biz = g.business.K * (BO[i] * BD[j] + BO[j] * BD[i]) * Math.exp(D.bizE * ld);
        const vfr = g.vfr.K * 2 * SP[i] * SP[j] * Math.exp(D.vfrE * ld);
        v = 0.5 * border * lh * (leis + biz + vfr) * (dom ? 1 : bigPairV(VI[i], VI[j], dk)) * (dk < 900 ? accessibility(C[i], C[j]) : 1);
      }
      if (v > 0) { pi.push(i); pj.push(j); pv.push(v); pd.push(dom ? 1 : 0); }
    }
    const solve = (dom, vol) => {
      const tgt = Array.from(vol, (x) => x * (dom ? D.overDom : D.overIntl) * 1e6 / 730);   // Reisende je Richtung und Tag
      let k = new Float64Array(N).fill(1);
      for (let it = 0; it < 50; it++) {
        const sum = new Float64Array(N);
        for (let n = 0; n < pv.length; n++) if (pd[n] === dom) { sum[pi[n]] += k[pj[n]] * pv[n]; sum[pj[n]] += k[pi[n]] * pv[n]; }
        for (let i = 0; i < N; i++) k[i] = sum[i] > 0 ? Math.sqrt(k[i] * tgt[i] / sum[i]) : 0;
        // Deckel: höchstens kMax-fach über dem typischen Faktor (Median), sonst bläht eine einzelne Strecke auf
        const pos = Array.from(k).filter((x) => x > 0).sort((a, b) => a - b), med = pos.length ? pos[Math.floor(pos.length / 2)] : 1;
        for (let i = 0; i < N; i++) if (k[i] > D.kMax * med) k[i] = D.kMax * med;
      }
      return k;
    };
    const kD = solve(1, VD), kI = solve(0, VI);
    _demK = { dom: Object.fromEntries(C.map((c, i) => [c, kD[i]])), intl: Object.fromEntries(C.map((c, i) => [c, kI[i]])) };
    return _demK;
  }
  function tripGeneration(o, d) {
    const r = tripRaw(o, d), K = demandK(), L = isDom(o, d) ? K.dom : K.intl, f = (L[o] ?? 0) * (L[d] ?? 0) * bigPair(o, d);
    return { leisure: r.leisure * f, business: r.business * f, vfr: r.vfr * f };
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
      brand: extra.brand ?? P.BRAND_NEUTRAL, extraU: extra.extraU || null, bizPrem: extra.bizPrem || 0, conn: null, tax: extra.tax ?? null, human: !!extra.human, mat: extra.mat ?? 1 };
  }
  const capacity = (of) => ((of.priceOverride !== null || of.conn) ? Infinity : of.freq * of.seats);
  function indirectOffer(o, d, cpi = 1) {
    const c = P.INDIRECT;
    if (gcDistanceKm(o, d) < c.min_dist_km) return null;
    const long = gcDistanceKm(o, d) >= 4000;
    const of = offer(INDIRECT_ID, 0, long ? 5 : c.freq, 0, c.service, c.otp, 1);
    of.priceOverride = (long ? 0.9 : c.price_vs_ref) * refPrice(o, d, cpi);
    of.penalty = c.penalty;
    return of;
  }
  const INCUMBENT_ID = '_inc';
  /**
   * Etablierte Airlines, die das Spiel nicht einzeln simuliert: Sie bieten auf jedem nennenswerten Markt so viele Sitze an,
   * wie dort real geflogen wird – abzüglich dessen, was simulierte KI-Airlines schon anbieten. Neue Kapazität von Spielenden
   * verdrängt sie nicht, sie muss sich die Reisenden im Wettbewerb holen.
   */
  function incumbentOffer(o, d, offers, cpi = 1) {
    const I = P.INCUMBENT, dk = gcDistanceKm(o, d);
    if (dk < P.MIN_ROUTE_KM) return null;
    const q = qPot(o, d), pot = q.leisure + q.business + q.vfr;
    if (pot < I.minPot) return null;
    let ai = 0;
    for (const of of offers) if (!of.human && of.priceOverride === null && !of.conn && of.airline !== INDIRECT_ID && of.airline !== INCUMBENT_ID) ai += of.freq * of.seats;
    const seats = I.share * pot * accessibility(o, d) - ai;
    if (seats < I.minSeats) return null;
    const spf = dk < 1500 ? 150 : dk < 4000 ? 190 : 290, freq = clamp(Math.round(seats / spf), 1, I.maxFreq);
    const of = offer(INCUMBENT_ID, I.priceVsRef * refPrice(o, d, cpi), freq, seats / freq, I.service, I.otp, 1, INCUMBENT_ID, { brand: I.brand });
    return of;
  }
  function withIndirect(o, d, offers, cpi = 1) {
    const out = offers.slice(), i = indirectOffer(o, d, cpi), inc = incumbentOffer(o, d, offers, cpi);
    if (inc) out.push(inc); if (i) out.push(i);
    return out;
  }
  function perceivedPrice(o, of, seg) {
    if (of.priceOverride !== null) return of.priceOverride;
    const fare = seg === 'business' ? of.fare * (1 + 0.5 * of.bizPrem) : of.fare;
    return fare + (of.tax ?? ap(o).tax) + P.ANCILLARY_PRICE_WEIGHT * P.SERVICE[of.service].ancillary;
  }
  function utility(o, d, seg, of, cpi = 1) {
    const c = P.CHOICE[seg];
    return c.b_price * Math.log(perceivedPrice(o, of, seg) / refPrice(o, d, cpi))
      + c.b_freq * Math.log(Math.max(of.freqU ?? of.freq, 1)) + (of.freq < 1 ? P.SUBDAILY_U * c.b_freq * Math.log(Math.max(of.freq, 1 / 7)) : 0)
      + c.b_service * (P.SERVICE[of.service].svc - 0.5) * (P.SERVICE[of.service].svc > 0.5 ? of.mat ?? 1 : 1)
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
    // Heißer Pfad: Index-Arrays statt Objekte, Nutzen je Angebot und Segment nur einmal.
    const n = offers.length, mu = P.NEST_MU, SEG = P.SEGMENTS, NS = SEG.length;
    const U = [], booked = [], want = [];
    for (let s = 0; s < NS; s++) { const u = new Float64Array(n); for (let i = 0; i < n; i++) u[i] = utility(o, d, SEG[s], offers[i], cpi) / mu; U.push(u); booked.push(new Float64Array(n)); want.push(new Float64Array(n)); }
    const remCap = new Float64Array(n), ramp = new Float64Array(n), ws = new Float64Array(n);
    for (let i = 0; i < n; i++) { remCap[i] = capacity(offers[i]); ramp[i] = offers[i].ramp; }
    let open = []; for (let i = 0; i < n; i++) open.push(i);
    const toAssign = SEG.map((s) => pot[s]);
    let outside = 0, lost = 0;
    const unconstrained = {};
    for (let it = 0; it < maxIter; it++) {
      let tot = 0; for (let s = 0; s < NS; s++) tot += toAssign[s];
      if (!open.length || tot < 1e-9) break;
      for (let s = 0; s < NS; s++) {
        const q = toAssign[s], u = U[s], wa = want[s];
        let m = -Infinity; for (const i of open) if (u[i] > m) m = u[i];
        let sw = 0; for (const i of open) { ws[i] = ramp[i] * Math.exp(u[i] - m); sw += ws[i]; }
        const iv = mu * (m + Math.log(sw)), asc = P.CHOICE[SEG[s]].asc_out, mm = Math.max(iv, asc);
        const pAir = Math.exp(iv - mm) / (Math.exp(iv - mm) + Math.exp(asc - mm));
        for (const i of open) wa[i] = q * (pAir * ws[i] / sw);
        if (it === 0) outside += q * (1 - pAir); else lost += q * (1 - pAir);
      }
      if (it === 0) for (const i of open) { let t = 0; for (let s = 0; s < NS; s++) t += want[s][i]; unconstrained[offers[i].key] = t; }
      const next = new Array(NS).fill(0), still = [];
      for (const i of open) {
        let t = 0; for (let s = 0; s < NS; s++) t += want[s][i];
        const cap = remCap[i];
        if (t <= cap) { for (let s = 0; s < NS; s++) booked[s][i] += want[s][i]; remCap[i] -= t; still.push(i); }
        else { const share = t > 0 ? cap / t : 0; for (let s = 0; s < NS; s++) { booked[s][i] += want[s][i] * share; next[s] += want[s][i] * (1 - share); } remCap[i] = 0; }
      }
      open = still; for (let s = 0; s < NS; s++) toAssign[s] = next[s];
    }
    for (let s = 0; s < NS; s++) lost += toAssign[s];
    const bk = {};
    for (let i = 0; i < n; i++) { const b = {}; for (let s = 0; s < NS; s++) b[SEG[s]] = booked[s][i]; bk[offers[i].key] = b; }
    let potential = 0; for (const s of SEG) potential += pot[s];
    return { unconstrained, booked: bk, lost, outside, potential };
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
  /** Anlaufrabatt eines kleinen Flughafens (Anteil der Entgelte, die im ersten Jahr einer neuen Strecke entfallen). */
  function incentiveAt(apt) { const R = P.ROUTE_INCENTIVE; return R ? R.share * Math.max(0, 1 - (ap(apt).pax || 0) / R.maxPax) : 0; }
  /** Verwaltung je Flugzeug und Tag: wächst mit der Größe (Dash 8 rund 600 EUR, A320 900, A380 1.440). */
  function ovhAc(typeId) { const t = P.AIRCRAFT_TYPES[typeId]; return P.OVERHEAD_PER_AIRCRAFT_DAY * clamp(Math.sqrt((t.seats.standard || 180) / 180), 0.6, 1.6); }
  function aircraftDayFixedGeneric(typeId) {
    const t = P.AIRCRAFT_TYPES[typeId];
    return t.value_eur * P.INSURANCE.basic.rate / 365 + ovhAc(typeId) + t.lease_month * 12 / 365;
  }
  function turnHours(typeId, service, buffer, extraMin = 0) {
    return (P.AIRCRAFT_TYPES[typeId].turn_min + P.SERVICE[service].turn_delta + P.BUFFER_POLICY[buffer].extra_turn_min + extraMin) / 60;
  }
  function rotationHours(base, dest, typeId, service, buffer, extraBase = 0, extraDest = 0) {
    return 2 * blockHours(base, dest, typeId) + turnHours(typeId, service, buffer, extraBase) + turnHours(typeId, service, buffer, extraDest);
  }
  const winOf = (typeId) => P.AIRCRAFT_TYPES[typeId].window || P.OPERATING_WINDOW_H;
  /** Anteil Flugzeugtage: Umläufe länger als das Betriebsfenster binden ganze Flugzeuge. */
  /** Ganze Flugzeuge für einen Umlauf, der länger ist als das Betriebsfenster. Ein Flugzeug, das nur diesen einen Umlauf fliegt,
   *  schafft bis zu 22 Stunden (Langstreckentag mit Nachtflug) – auch ein Schmalrumpfjet auf dem Atlantik. 0 = passt ins Fenster. */
  const kOf = (typeId, h) => { const w = winOf(typeId); return h > w ? Math.ceil(h / Math.max(w, P.LONG_WINDOW_H)) : 0; };
  const acShareOf = (typeId, h, freq) => { const w = winOf(typeId), k = kOf(typeId, h); return freq * (k || h / w); };
  const pilotsFor = (bhLeg) => (bhLeg > 13 ? 4 : bhLeg > 9 ? 3 : 2);
  /** Köpfe für ein Flugzeug mit bh Blockstunden am Tag (Bruchteile; flottenweit aufgerundet). */
  const crewFor = (seats, cabin, bh) => ({ pil: Math.max(seats, seats * bh / P.STAFF.pilotH), cab: Math.max(cabin, cabin * bh / P.STAFF.cabinH) });
  const routeKmOk = (o, d) => gcDistanceKm(o, d) >= P.MIN_ROUTE_KM;
  /** Flughafen tauglich für das Muster? (A380 braucht Code-F-Flughäfen) */
  const aptOk = (o, d, typeId) => { const m = P.AIRCRAFT_TYPES[typeId].minAptPax; return !m || ((ap(o).pax || 0) >= m && (ap(d).pax || 0) >= m); };
  const aptWhy = (o, d, typeId) => { const t = P.AIRCRAFT_TYPES[typeId], m = t.minAptPax; if (!m) return ''; const bad = [o, d].filter((c) => (ap(c).pax || 0) < m); return bad.length ? `Die ${t.label} braucht Code-F-Flughäfen (ab ${m} Mio. Passagieren im Jahr) – ${bad.map((c) => ap(c).name).join(' und ')} ${bad.length > 1 ? 'sind' : 'ist'} zu klein.` : ''; };
  const rangeOk = (o, d, typeId) => gcDistanceKm(o, d) * P.ROUTE_DETOUR <= P.AIRCRAFT_TYPES[typeId].range_km && aptOk(o, d, typeId);
  /** Überschall: Zeitgewinn gegenüber einem Langstrecken-Jet macht Geschäftsreisende zahlungsbereit. */
  function sstBonus(o, d) {
    const hs = Math.max(0, blockHours(o, d, 'A359') - blockHours(o, d, 'CONC')), S = P.SST;
    return { business: Math.min(S.bizMax, S.bizPerH * hs), leisure: Math.min(S.leisureMax, S.leisurePerH * hs), vfr: Math.min(S.vfrMax, S.vfrPerH * hs) };
  }
  function withSst(extra, o, d, typeId) {
    if (!P.AIRCRAFT_TYPES[typeId] || !P.AIRCRAFT_TYPES[typeId].supersonic) return extra;
    const b = sstBonus(o, d), u = extra.extraU || {};
    return { ...extra, extraU: { leisure: (u.leisure || 0) + b.leisure, business: (u.business || 0) + b.business, vfr: (u.vfr || 0) + b.vfr } };
  }
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
    const seats = cabinSeats(spec.type_id, spec.service, spec.cab).total;
    const res = { dirs: {} }, totals = {};
    for (const [dir, o, d, comps, fare] of [['out', spec.base, spec.dest, compsOut, spec.fare_out], ['in', spec.dest, spec.base, compsIn, spec.fare_in]]) {
      const ex = withCabin((opts.offerExtra && opts.offerExtra[dir]) || {}, spec.type_id, spec.service, spec.cab);
      const own = offer(spec.airline, fare, spec.freq, seats, spec.service, spec.otp ?? P.BUFFER_POLICY[spec.buffer].otp, spec.ramp ?? 1, spec.airline, ex);
      own.human = ex.human !== undefined ? !!ex.human : true;   // eigene Kapazität verdrängt etablierte Airlines nicht (KI schon)
      const offers = withIndirect(o, d, [own].concat(comps), cpi);
      const ss = opts.segScale ? opts.segScale[dir] : null;
      const { acc, market } = marketDraws(o, d, offers, month, nDraws, rng, scale, ss, cpi);
      const me = acc[spec.airline];
      const pax = me.pax, perFlight = pax / spec.freq;
      const prem = ex.bizPrem || 0;
      const cr = cabinRevenue(spec.type_id, spec.service, spec.cab, spec.freq, fare, me.seg.business, pax - me.seg.business, spec.pm);
      const fareRev = ((pax + me.seg.business * prem) * fare + cr.extra) * (P.AIRCRAFT_TYPES[spec.type_id].yieldF || 1);
      const c = opts.costFn ? opts.costFn(o, d, perFlight, fareRev / spec.freq, dir) : legCosts(o, d, spec.type_id, spec.service, spec.buffer, perFlight, fareRev / spec.freq, fuel, cpi);
      const costs = {};
      c.pax_service = (c.pax_service || 0) + cr.cost * cpi / spec.freq;
      for (const k of COST_KEYS.concat(['disruption_expected'])) { costs[k] = (c[k] || 0) * spec.freq; totals[k] = (totals[k] || 0) + costs[k]; }
      const comp = {};
      for (const key in acc) { if (key === spec.airline || key === INDIRECT_ID || key === INCUMBENT_ID) continue; comp[acc[key].airline] = (comp[acc[key].airline] || 0) + acc[key].pax; }
      res.dirs[dir] = { o, d, pax, seg: me.seg, unconstrained: me.unc, seats: spec.freq * seats, lf: pax / (spec.freq * seats), prem: cr.f + cr.b, premRev: cr.extra,
        fareRev, ancRev: pax * P.SERVICE[spec.service].ancillary * cpi, costs, market, competitors: comp, incumbent: acc[INCUMBENT_ID] ? acc[INCUMBENT_ID].pax : 0, incSeats: (offers.find((x) => x.airline === INCUMBENT_ID) || {}).seats * ((offers.find((x) => x.airline === INCUMBENT_ID) || {}).freq || 0) || 0, indirect: acc[INDIRECT_ID] ? acc[INDIRECT_ID].pax : 0, bh: c._bh };
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
    'pax_fees', 'pax_service', 'distribution', 'cargo_cost', 'disruption', 'stations', 'slots', 'lease', 'depreciation', 'insurance', 'experts', 'marketing', 'loyalty', 'overhead', 'one_off', 'trade', 'interest', 'tax'];
  const cents = (x) => Math.round(x * 100);
  // ---------- Kabinen: First / Business / Economy ----------
  function haulOf(typeId) { const k = P.AIRCRAFT_TYPES[typeId].ill.kind; return k === 'wide' ? 'long' : k === 'sst' ? null : 'short'; }
  function cabinShares(typeId, cab) {
    const h = haulOf(typeId); if (!h || !cab || !cab[h]) return null;
    const C = P.CABIN[h], f = h === 'long' ? clamp(Number(cab[h].f) || 0, 0, C.maxF) : 0, b = clamp(Number(cab[h].b) || 0, 0, Math.min(C.maxB, 1 - f));
    return f || b ? { h, f, b } : null;
  }
  /** Sitze je Klasse; cab = { short: {f, b}, long: {f, b} } (Flächenanteile), Economy ist der Rest. */
  function cabinSeats(typeId, service, cab) {
    const base = P.AIRCRAFT_TYPES[typeId].seats[service], sh = cabinShares(typeId, cab);
    if (!sh) return { f: 0, b: 0, e: base, total: base };
    const C = P.CABIN[sh.h], f = sh.f ? Math.floor(base * sh.f / C.firstArea) : 0, b = Math.floor(base * sh.b / C.bizArea), e = Math.max(0, Math.round(base * (1 - sh.f - sh.b)));
    return { f, b, e, total: Math.max(1, f + b + e) };
  }
  /** Mehrerlös aus Premiumklassen an einem Tag: Geschäftsreisende (und wenige Urlauber) zahlen den Klassenaufschlag, solange Plätze frei sind. */
  function cabinRevenue(typeId, service, cab, flights, fare, bizPax, othPax, pm = 1) {
    const s = cabinSeats(typeId, service, cab);
    if (!(s.f || s.b) || flights <= 0 || !(fare > 0)) return { extra: 0, cost: 0, f: 0, b: 0, seats: 0 };
    const C = P.CABIN[haulOf(typeId)], m = clamp(Number(pm) || 1, P.PREM_PRICE.min, P.PREM_PRICE.max), k = Math.pow(m, -P.PREM_PRICE.el);
    const dF = (bizPax * C.qFirst + othPax * C.leisF) * k, dB = (bizPax * C.qBiz + othPax * C.leisB) * k;
    const sf = Math.min(s.f * flights, dF), sb = Math.min(s.b * flights, dB + (dF - sf) * 0.6);
    return { extra: fare * (sf * (C.firstMult * m - 1) + sb * (C.bizMult * m - 1)), cost: sf * C.costF + sb * C.costB, f: sf, b: sb, seats: (s.f + s.b) * flights };
  }
  /** Geschäftsreisende bevorzugen Airlines mit Premiumkabine (Nutzenaufschlag, sättigt bei ~15 % Premiumsitzen). */
  function withCabin(extra, typeId, service, cab) {
    const s = cabinSeats(typeId, service, cab); if (!(s.f || s.b)) return extra;
    const bonus = P.CABIN.bizU * Math.min(1, ((2 * s.f + s.b) / s.total) / 0.15) * ((extra && extra.mat) ?? 1), u = (extra && extra.extraU) || {};
    return { ...(extra || {}), extraU: { leisure: (u.leisure || 0) + 0.04 * bonus, business: (u.business || 0) + bonus, vfr: (u.vfr || 0) + 0.03 * bonus } };
  }
  const cabClone = (c) => (c ? { short: { f: 0, b: +(c.short && c.short.b) || 0 }, long: { f: +(c.long && c.long.f) || 0, b: +(c.long && c.long.b) || 0 } } : null);

  /** Tagesverlauf: Konten zu acht Gruppen zusammengefasst (Euro, gerundet). Reihenfolge = DAY_GROUPS. */
  const DAY_GROUPS = ['Erlöse', 'Kerosin', 'Flugbetrieb', 'Personal', 'Flugzeuge & Standorte', 'Verwaltung & Marketing', 'Einmalkosten', 'Zinsen & Steuern'];
  const DAY_GROUP_OF = (k) => (k.startsWith('rev_') ? 0 : k === 'fuel' || k === 'hedge' ? 1
    : ['crew', 'maintenance', 'navigation', 'landing', 'handling', 'pax_fees', 'pax_service', 'distribution', 'cargo_cost', 'disruption'].includes(k) ? 2
      : k.startsWith('staff_') || k === 'experts' ? 3 : ['lease', 'depreciation', 'insurance', 'stations', 'slots'].includes(k) ? 4
        : k === 'one_off' ? 6 : k === 'interest' || k === 'tax' ? 7 : 5);
  function dayGroupsOf(acc) {
    const g = DAY_GROUPS.map(() => 0);
    for (const k in acc || {}) if (!k.startsWith('cf_')) g[DAY_GROUP_OF(k)] += acc[k] / 100;
    return g.map((x) => Math.round(x));
  }
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
    closeDay() {
      let r = 0; for (const k in this.today) if (!k.startsWith('cf_')) r += this.today[k];
      this.lastDay = r / 100;
      this.cashHist.push(this.cash / 100); if (this.cashHist.length > 400) this.cashHist.shift(); this.today = {};
    }
    closeMonth(label) { this.months.push({ label, acc: this.month }); if (this.months.length > 36) this.months.shift(); this.month = {}; }
    netIncome() { let s = 0; for (const k in this.pnl) s += this.pnl[k]; return s / 100; }
  }
  class Route {
    constructor(o) { Object.assign(this, { pending: [], autoPrice: true, targetLf: 0.85, hist: [], closed: false, reviewNeg: 0, lastChange: -999, closedDay: null, flyingToday: 0 }, o); }
    seats() { return this.cab ? cabinSeats(this.type_id, this.service, this.cab).total : P.AIRCRAFT_TYPES[this.type_id].seats[this.service]; }
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
  function roleLabel(role, group) { if (role === 'pilot') return `Piloten (${P.TYPE_GROUPS[group]})`; if (role === 'cabin') return 'Flugbegleiterinnen'; return 'Techniker'; }

  // ===========================================================================
  // Airline
  // ===========================================================================
  class Airline {
    constructor(id, name, base, archetype = null, equity = P.START_EQUITY_EUR, maxFleet = 99, color = null) {
      Object.assign(this, { id, name, archetype, color, bases: [base], fleet: [], routes: [], typesIntroduced: [], creditUsed: 0,
        lossCarry: 0, monthPnlStart: 0, distressDays: 0, status: 'active', events: [], otpHist: [], maxFleet, warnLevel: null,
        acCounter: 0, routeCounter: 0, sigma: null, brand: archetype ? P.AI_ARCHETYPES[archetype].brand : 0.40, marketing: 0,
        cargo: archetype ? P.AI_ARCHETYPES[archetype].cargo : false, loans: [], rating: 'BB', insurance: 'basic',
        hedge: null, experts: [], studies: {}, stations: {}, hangars: [], decisions: [], milestones: {}, slotHold: {},
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
    /** Wirksame Stufe einer Rolle: zugesagte Stufe × tatsächliche Leistung (kann über- oder unterschreiten). */
    skill(role) { let lv = 0; const d = this._day ?? 0; for (const e of this.experts) if (e.role === role || (P.EXPERT_ROLES[e.role] && P.EXPERT_ROLES[e.role].unique)) lv = Math.max(lv, e.level * expertPerf(e, d)); return lv; }
    /** Zugesagte Stufe (für Freischaltungen wie Marktstudien). */
    skillNom(role) { let lv = 0; const d = this._day ?? 0; for (const e of this.experts) if ((e.role === role || (P.EXPERT_ROLES[e.role] && P.EXPERT_ROLES[e.role].unique)) && !(e.startDay > d)) lv = Math.max(lv, e.level); return lv; }
    /** Luis Perez an Bord? Dann kennt die Airline Zustand und Wert älterer Flugzeuge. */
    /** Kontostand abzüglich genutzter Kreditlinie: darf bis zur Linie ins Minus (Dispo). */
    netCash() { return this.ledger.cash / 100 - (this.creditUsed || 0); }
    /** Was jetzt ausgegeben werden kann: Kontostand plus freier Dispo. */
    spendable(bank = 1) { return this.ledger.cash / 100 + Math.max(0, this.creditLimit(bank) - (this.creditUsed || 0)); }
    oldAcExpert() { return this.experts.some((e) => e.role === 'fleetadvisor'); }
    /** Preisfaktor für ältere Flugzeuge (Gebrauchtmarkt, alte Muster vom Leasinggeber). */
    oldAcFactor(age) { return this.oldAcExpert() && age >= P.OLD_AC_AGE ? 0.9 : 1; }
    stage() { const n = this.fleet.length; let s = P.STAGES[0]; for (const st of P.STAGES) if (n >= st.min) s = st; return s; }
    /** Verwaltung pro Tag: KI nach Stufe, Spielende entlang P.HQ_CURVE (linear zwischen den Stützpunkten). */
    hqDay() {
      if (!this.isPlayer) return this.stage().hq;
      const n = this.fleet.length, C = P.HQ_CURVE;
      for (let i = 1; i < C.length; i++) if (n <= C[i][0]) { const [x0, y0] = C[i - 1], [x1, y1] = C[i]; return y0 + (y1 - y0) * (n - x0) / (x1 - x0); }
      return C[C.length - 1][1];
    }
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
      const u = { leisure: (a.leisure + b.leisure) / 2, business: (a.business + b.business) / 2, vfr: (a.vfr + b.vfr) / 2 };
      const hl = this.hubs ? Math.max(this.hubs[o] || 0, this.hubs[d] || 0) : 0;
      if (hl) { u.business += 0.06 * hl; u.leisure += 0.01 * hl; }   // Heimvorteil am Drehkreuz: Netz, Anschlüsse, Lounges
      const lv = this.loyalty && this.loyalty.lv, lf = lv ? this.loyaltyFactor(this._day ?? 0) : 0;
      if (lf > 0) { const LU = P.LOYALTY[lv].u; u.leisure += LU.leisure * lf; u.business += LU.business * lf; u.vfr += LU.vfr * lf; }
      return u;
    }
    bizPrem() { return lv3([0, 0.08, 0.15, 0.22], this.skill('revenue')); }
    /** Kabinenaufteilung der Airline (Spielende: Strategie; Premium-KI: Standard mit Business, auf Langstrecke auch First). */
    cabinCfg() { return this.cabin || (this.archetype === 'premium' ? P.CABIN.ai : null); }
    /** Wirkung des Vielfliegerprogramms (0…1): wächst über 6 Monate und mit der Größe des Netzes. */
    loyaltyFactor(day) {
      const L = this.loyalty; if (!L || !L.lv) return 0;
      const mat = clamp((day - (L.since ?? day)) / 180, 0.15, 1), n = this.activeRoutes().length;
      return mat * clamp(0.35 + 0.65 * Math.log(1 + n) / Math.log(41), 0.35, 1);
    }
    rampT() { return lv3([30, 24, 20, 16], this.skill('marketing')); }
    /** Bekanntheit: Eine neue Airline muss sich erst einen Namen machen – Marke, Premiumprodukt und Premiumkabine wirken über rund ein Jahr. */
    maturity(day) { if (!this.isPlayer) return 1; const age = day - (this.joinedDay || 0); return clamp((age - P.BRAND_MATURITY.delay) / P.BRAND_MATURITY.days, 0, 1); }
    brandEff(day) { const b = this.brand ?? 0.4; return b <= P.BRAND_NEUTRAL ? b : P.BRAND_NEUTRAL + (b - P.BRAND_NEUTRAL) * this.maturity(day); }
    ratingInfo() { return P.RATINGS.find((x) => x.r === this.rating) || P.RATINGS[2]; }
    creditLimit(bank = 1) {
      const owned = this.fleet.filter((a) => a.owned).reduce((s, a) => s + a.nbv, 0);
      if (!this.isPlayer) return P.CREDIT_LINE_BASE + P.CREDIT_LINE_ASSET_SHARE * owned;
      // Spieler: kleine Grundlinie nach Rating, dazu ein Anteil am Umsatz der letzten drei Monate; die Bankenstimmung schwankt mit der Konjunktur
      const ms = this.ledger.months.slice(-3);
      const rev = ms.length ? ms.reduce((s, m) => s + ((m.acc.rev_ticket || 0) + (m.acc.rev_ancillary || 0) + (m.acc.rev_cargo || 0) + (m.acc.rev_acmi || 0)) / 100, 0) / ms.length : 0;
      const f = this.ratingInfo().line, fin = lv3([1, 1.25, 1.5, 2], this.skill('finance'));   // Finanzfachkraft: +25 / +50 / +100 % auf die ganze Linie
      return Math.max(0, (P.CREDIT_LINE_BASE * 0.4 * f + 0.35 * rev * f / 1.4 + P.CREDIT_LINE_ASSET_SHARE * owned) * fin * bank);
    }
    creditRate(baseRate, bank = 1) { return baseRate + (this.isPlayer ? this.ratingInfo().spread - lv3([0, 0.005, 0.01, 0.015], this.skill('finance')) + (1 - bank) * 0.03 : 0.025) + 0.02; }

    newAircraft(typeId, base, o = {}) {
      this.acCounter++;
      return Object.assign({ id: `${this.id}-${String(this.acCounter).padStart(3, '0')}`, type_id: typeId, base, owned: false, flex: false,
        delivery_day: 0, lease_start: 0, nbv: 0, loan: 0, loanRate: 0, used_hours: 0, idle_days: 0, deposit: 0, age0: P.AIRCRAFT_TYPES[typeId].age,
        bornDay: 0, fh: 0, lastC: 0, status: 'ok', until: null, mode: 'auto', pins: [], leaseUsd: P.AIRCRAFT_TYPES[typeId].lease_month * P.EURUSD, leaseMonth: P.AIRCRAFT_TYPES[typeId].lease_month, acmi: null, assigned: [] }, o);
    }
    acquire(day, typeId, base, mode = 'lease', offerData = null, world = null) {
      const t = P.AIRCRAFT_TYPES[typeId], L = this.ledger;
      if (world && !offerData && (mode === 'lease' || mode === 'flex') && (world.lessorStock[typeId] ?? capOf(world, typeId)) <= (this.isPlayer ? 0 : 1)) return null;
      const age = mode === 'factory' || (offerData && offerData.auction) ? 0 : offerData ? offerData.age : t.age;
      const ac = this.newAircraft(typeId, base, { age0: age, bornDay: day, fh: offerData ? offerData.fhSinceC || 0 : Math.floor(age * 1700) % P.CCHECK_FH, lastC: 0, cond: offerData && offerData.cond ? offerData.cond : 1 });
      const oldF = offerData && offerData.auction ? 1 : this.oldAcFactor(age);
      if (!this.familyKnown(typeId)) L.post('one_off', -P.TYPE_INTRO_COST);
      if (!this.typesIntroduced.includes(typeId)) this.typesIntroduced.push(typeId);
      const eurusd = world ? world.macro.eurusd : P.EURUSD;
      const duty = 1 + (world ? acTariff(world, this, typeId) : 0);
      if (world && !offerData && (mode === 'lease' || mode === 'flex')) {
        const st = world.lessorStock[typeId] ?? capOf(world, typeId);
        if (st <= (this.isPlayer ? 0 : 1)) return null;   // ausverkauft (KI lässt einen Rest)
        world.lessorStock[typeId] = st - 1;
      }
      if (world && !offerData) { world.lessorQueue[typeId] = (world.lessorQueue[typeId] || 0) + 1; if (!this.isPlayer) world.labor.aiAc = (world.labor.aiAc || 0) + 1; }
      const rk = riskTerms(this, typeId);
      if (mode === 'buy' || mode === 'factory') {
        const price = (offerData ? offerData.price : t.value_eur * (mode === 'factory' ? 1.08 : 1)) * duty * (mode === 'factory' ? 1 : oldF);
        ac.owned = true; ac.delivery_day = day + (mode === 'factory' ? (world ? leaseDelivery(world, typeId, 'factory') : P.FACTORY_DELIVERY_DAYS) : (offerData ? offerData.delivery : P.PURCHASE_DELIVERY_DAYS));
        ac.nbv = price; ac.value0 = price; ac.loan = price * (1 - rk.down);
        ac.loanRate = world ? world.macro.rate + 0.025 : 0.06;
        L.cashOnly(-price, 'capex'); L.cashOnly(ac.loan, 'loan_draw');
      } else {
        ac.flex = mode === 'flex';
        ac.delivery_day = day + (offerData ? offerData.delivery : (world ? leaseDelivery(world, typeId, 'lease') : P.LEASE_DELIVERY_DAYS));
        ac.lease_start = ac.delivery_day;
        ac.leaseUsd = (offerData ? offerData.lease_month : t.lease_month) * P.EURUSD * duty * oldF * rk.lease;
        ac.leaseMonth = ac.leaseUsd / eurusd;
        if (rk.gap) ac.riskPrem = rk.lease;
        if (!ac.flex) { ac.deposit = rk.dep * ac.leaseMonth; L.cashOnly(-ac.deposit, 'deposit'); }
      }
      this.fleet.push(ac);
      const modeTxt = { buy: 'gekauft', factory: 'fabrikneu bestellt', flex: 'per Flex-Leasing übernommen', lease: 'geleast' }[mode];
      this.log(day, `${P.AIRCRAFT_TYPES[typeId].label} ${modeTxt}${age >= 1 ? ` (${Math.round(age)} Jahre alt)` : ''}, Lieferung in ${ac.delivery_day - day} Tagen`, 'fleet');
      return ac;
    }
    familyKnown(typeId) { const g = P.AIRCRAFT_TYPES[typeId].group; return this.typesIntroduced.some((x) => P.AIRCRAFT_TYPES[x] && P.AIRCRAFT_TYPES[x].group === g); }
    acAge(ac, day) { return ac.age0 + Math.max(0, day - ac.bornDay) / 365; }
    saleRate(ac, day) { return this.oldAcExpert() && this.acAge(ac, day) >= P.OLD_AC_AGE ? 1 : 0.92; }
    disposeCost(day, ac) {
      if (ac.owned) { const q = this.saleRate(ac, day); return { pnl: ac.nbv * q - ac.nbv, cash: ac.nbv * q - ac.loan }; }
      if (ac.flex) return { pnl: 0, cash: 0 };
      const monthsUsed = (day - ac.lease_start) / 30.4;
      const pen = (monthsUsed < P.LEASE_MIN_TERM_MONTHS ? P.LEASE_EARLY_RETURN_MONTHS * ac.leaseMonth : 0) + (ac.delivery_day <= day ? P.LEASE_RETURN_COST : 0);
      return { pnl: -pen, cash: ac.deposit - pen };
    }
    dispose(day, ac, reason = '') {
      const L = this.ledger;
      if (ac.owned) {
        const sale = Math.round(ac.nbv * this.saleRate(ac, day) * 100) / 100;
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
      const cab = cabClone(this.cabinCfg()); if (cab) r.cab = cab;
      if (this.isPlayer && this.apDefault > 0) { r.ap = this.apDefault; if (this.apCfg) r.apo = { ...this.apCfg }; }
      this.routes.push(r);
      if (this.isPlayer) { this.station(base); this.station(dest); }
      if (logIt) this.log(day, `Strecke ${base}–${dest} eröffnet: ${freq}x täglich, ${P.AIRCRAFT_TYPES[typeId].label}, ${Math.round(fareOut)}/${Math.round(fareIn)} EUR`, 'route');
      return r;
    }
    closeRoute(day, r, why) {
      r.closed = true; r.closedDay = day; this.log(day, `Strecke ${r.base}–${r.dest} geschlossen (${why})`, 'route');
      for (const a of this.fleet) if (a.pins && a.pins.length) a.pins = a.pins.filter((p) => p.route !== r.id);
      for (const x of [r.base, r.dest]) this.release(x, r.freq, day);
    }
    // Slot-Reserve: freigewordene Slots an koordinierten Flughäfen bleiben eine Zeit lang bei der Airline (handelbar, wiederverwendbar)
    heldAt(apt, day) { return (this.slotHold[apt] || []).reduce((s, h) => s + (h.until > day ? h.n : 0), 0); }
    hold(apt, n, until, buy = false) { if (!(n > 0) || !P.AIRPORTS[apt] || apx(apt).slots === null) return; (this.slotHold[apt] = this.slotHold[apt] || []).push(buy ? { n, until: 1e9, buy: true } : { n, until }); }
    /** Frei gewordene Slots: Spielende haben sie bezahlt und behalten sie (Reserve, Slotgebühr läuft weiter, Rückgabe zum halben Preis). */
    release(apt, n, day) { if (this.isPlayer) this.hold(apt, n, 0, true); else this.hold(apt, n, day + SLOT_HOLD_DAYS); }
    useHeld(apt, n, day) {
      let left = n; const lst = (this.slotHold[apt] || []).filter((h) => h.until > day).sort((a, b) => a.until - b.until);
      for (const h of lst) { const k = Math.min(h.n, left); h.n -= k; left -= k; if (!left) break; }
      this.slotHold[apt] = lst.filter((h) => h.n > 0); if (!this.slotHold[apt].length) delete this.slotHold[apt];
      return n - left;
    }
    /** Gekaufte Slots sind immaterielle Vermögenswerte (Buchwert je Flughafen), nicht laufender Aufwand. */
    slotInvest(apt, cost, n) { if (!(cost > 0)) return; this.ledger.cashOnly(-cost, 'slots'); const b = this.slotBook || (this.slotBook = {}); const x = b[apt] || (b[apt] = { n: 0, v: 0 }); x.n += n; x.v += cost; }
    slotDivest(apt, n) { const b = this.slotBook; if (!b || !b[apt]) return 0; const x = b[apt], k = Math.min(n, x.n), v = x.n > 0 ? x.v * k / x.n : x.v; x.n -= k; x.v -= v; if (x.n <= 0 || x.v < 1) delete b[apt]; return v; }
    slotBookTotal() { let s = 0; for (const k in this.slotBook || {}) s += this.slotBook[k].v; return s; }
    cleanHolds(day) { for (const k of Object.keys(this.slotHold)) { this.slotHold[k] = this.slotHold[k].filter((h) => h.until > day && h.n > 0); if (!this.slotHold[k].length) delete this.slotHold[k]; } }
    plan(day, routes = null, horizon = 0) {
      routes = routes || this.activeRoutes();
      // Einsatzarten je Flugzeug: auto (Planer verteilt), manual (nur feste Zuweisungen), reserve (nur als Ersatz).
      // assign[acId] = [[route, Stunden, Anteil am Umlauf]]; Langstrecken-Umläufe über dem Betriebsfenster binden k Flugzeuge.
      // Fehlen Flugzeuge, fliegt eine Langstrecke im Teilbetrieb (m von k Tagen).
      const assign = {}, used = {}, left = {}, byId = {}, partial = {};
      for (const a of this.fleet) { assign[a.id] = []; used[a.id] = 0; }
      for (const r of routes) { left[r.id] = r.freq; byId[r.id] = r; }
      const avail = (a) => this.available(a, day, horizon), modeOf = (a) => a.mode || 'auto';
      // Flüge seltener als täglich (wk = Flüge pro Woche): im Mittel nur wk/7 der Umlaufzeit, passt auch eine Langstrecke so in den Tag eines Flugzeugs
      const wkF = (r) => (r.wk > 0 && r.wk < 7 ? r.wk / 7 : 1), hOf = (r) => this.rotH(r) * wkF(r), isLong = (r) => wkF(r) === 1 && this.rotH(r) > winOf(r.type_id);
      const pinnedTo = (a, r) => modeOf(a) === 'manual' && (a.pins || []).some((p) => p.route === r.id);
      const fits = (a, r) => a.type_id === r.type_id && a.base === r.base && avail(a);
      // 1) Feste Zuweisungen auf Kurz- und Mittelstrecken
      for (const a of this.fleet) {
        if (modeOf(a) !== 'manual' || !avail(a)) continue;
        for (const p of a.pins || []) {
          const r = byId[p.route]; if (!r || r.type_id !== a.type_id || r.base !== a.base) continue;
          const h = hOf(r), w = Math.max(winOf(r.type_id), wkF(r) < 1 ? Math.min(P.LONG_WINDOW_H, this.rotH(r)) : 0);
          if (isLong(r)) continue;
          for (let i = 0; i < p.n && left[r.id] > 0 && used[a.id] + h <= w + 1e-9; i++) { used[a.id] += h; assign[a.id].push([r, h, wkF(r)]); left[r.id]--; }
        }
      }
      const unplaced = {};
      let ok = true;
      // 2) Langstrecken: erst fest zugewiesene, dann automatische, dann Reserve-Flugzeuge
      const longs = routes.filter((r) => isLong(r)).sort((x, y) => this.rotH(y) - this.rotH(x));
      for (const r of longs) {
        const h = this.rotH(r), w = winOf(r.type_id), k = kOf(r.type_id, h);
        while (left[r.id] > 0) {
          const free = (pool) => this.fleet.filter((a) => fits(a, r) && used[a.id] === 0 && pool(a));
          const cand = [...free((a) => pinnedTo(a, r)), ...free((a) => modeOf(a) === 'auto'), ...free((a) => modeOf(a) === 'reserve')];
          if (!cand.length) break;
          const take = cand.slice(0, k);
          for (const a of take) { used[a.id] = w; assign[a.id].push([r, h / k, 1 / k]); }
          left[r.id]--;
          if (take.length < k) { partial[r.id] = (partial[r.id] || 0) + take.length / k; break; }
        }
        if (left[r.id] > 0) { ok = false; unplaced[r.id] = left[r.id]; left[r.id] = 0; }
      }
      // 3) Automatik, 4) Reserve springt ein, wenn sonst ein Umlauf ausfiele
      const rots = [];
      for (const r of routes) { if (isLong(r)) continue; const h = hOf(r); for (let i = 0; i < left[r.id]; i++) rots.push([h, r]); }
      rots.sort((a, b) => b[0] - a[0]);
      for (const [h, r] of rots) {
        let placed = false;
        const w = Math.max(winOf(r.type_id), wkF(r) < 1 ? Math.min(P.LONG_WINDOW_H, this.rotH(r)) : 0);
        for (const pool of ['auto', 'reserve']) {
          for (const a of this.fleet) if (modeOf(a) === pool && fits(a, r) && used[a.id] + h <= w + 1e-9) { used[a.id] += h; assign[a.id].push([r, h, wkF(r)]); placed = true; break; }
          if (placed) break;
        }
        if (!placed) { ok = false; unplaced[r.id] = (unplaced[r.id] || 0) + 1; }
      }
      // Für neue Strecken zählt nur freie Zeit von Flugzeugen im Automatikbetrieb
      const usedOut = { ...used };
      for (const a of this.fleet) if (modeOf(a) !== 'auto') usedOut[a.id] = Math.max(used[a.id], winOf(a.type_id));
      return { ok, assign, used: usedOut, usedReal: used, unplaced, partial };
    }
    spareCapacity(day, typeId, base, hours) {
      const { used } = this.plan(day, null, P.LEASE_DELIVERY_DAYS), w = winOf(typeId);
      const cands = this.fleet.filter((a) => a.type_id === typeId && a.base === base && this.available(a, day, P.LEASE_DELIVERY_DAYS));
      if (hours > w) return cands.filter((a) => (used[a.id] || 0) === 0).length >= kOf(typeId, hours);
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
    /**
     * Crew-Bedarf aus dem Einsatzplan, nach Blockstunden: je Flugzeug Cockpitplätze × Blockstunden ÷ 3 (mindestens
     * eine Besetzung), Kabine ebenso. Piloten je Musterfamilie und Kabine werden flottenweit zusammengezählt und aufgerundet.
     */
    crewNeed(day, routes = null, horizon = 0) {
      const S = P.STAFF, need = { pil: zeroGroups(), cab: 0, perAc: {} };
      const { assign } = this.plan(day, routes || this.activeRoutes().filter((r) => r.opened_day <= day + horizon), horizon);
      for (const a of this.fleet) {
        let bh = 0, seats = 0;
        for (const [r, , share] of assign[a.id] || []) { const leg = blockHours(r.base, r.dest, r.type_id); bh += leg * 2 * (share ?? 1); seats = Math.max(seats, pilotsFor(leg), P.AIRCRAFT_TYPES[a.type_id].cockpit || 2); }
        if (a.acmi && a.acmi.start <= day + horizon && a.acmi.end > day) { bh = Math.max(bh, 8); seats = Math.max(seats, 2); }
        if (bh <= 0) continue;
        const t = P.AIRCRAFT_TYPES[a.type_id], c = crewFor(seats, t.cabin, bh);
        need.pil[t.group] += c.pil; need.cab += c.cab;
        need.perAc[a.id] = { group: t.group, bh, seats, pil: c.pil, cab: c.cab };
      }
      for (const g of STAFF_GROUPS) need.pil[g] = Math.ceil(need.pil[g] - 1e-6);
      need.cab = Math.ceil(need.cab - 1e-6);
      return need;
    }
    staffNeedPlanned(horizon = P.LEASE_DELIVERY_DAYS, day = this._day ?? 0) {
      // Bedarf an Köpfen für den aktuellen Flugplan (ohne Reserve), je Flugzeug gerechnet – inklusive Flugzeuge und Strecken, die bis zum Horizont starten
      const n = this.crewNeed(day, null, Math.max(P.LEASE_DELIVERY_DAYS, horizon));
      return { pil: n.pil, cab: n.cab, tech: this.fleet.length * P.STAFF.techPerAc, perAc: n.perAc };
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
  /** Einstellungen der Preisautomatik einer Strecke (fehlende Werte: Standard), geprüft und begrenzt. */
  function apCfgOf(r, src) {
    const A = P.PLAYER_AUTO_PRICE, o = { ...A.def, ...((src || (r && r.apo)) || {}) }, out = {};
    for (const k of Object.keys(A.def)) {
      const v = Number(o[k]); const [lo, hi] = A.lim[k];
      out[k] = !Number.isFinite(v) ? A.def[k] : (k === 'min' || k === 'plf') && v <= 0 ? 0 : clamp(Math.round(v * 1000) / 1000, lo, hi);
    }
    if (out.min && out.max < out.min + 0.1) out.max = Math.min(A.lim.max[1], out.min + 0.1);
    return out;
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
    fuel_spike: { p: 0.06 }, fuel_drop: { p: 0.035 }, recession: { p: 0.045 }, boom: { p: 0.035 }, atc_strike: { p: 0.08 },
    airport_strike: { p: 0.07 }, volcano: { p: 0.006 }, big_event: { p: 0.07 }, tax_change: { p: 0.04 }, rate_change: { p: 0.09 },
    health: { p: 0.006 }, pilot_shortage: { p: 0.04 }, fx_shock: { p: 0.05 },
    trade_war: { p: 0.05 }, trade_deal: { p: 0.03 }, airspace: { p: 0.03 }, carbon: { p: 0.02 }, fee_hike: { p: 0.04 }, currency_crisis: { p: 0.03 }, oil_crisis: { p: 0.012 },
  };
  // Handelsblöcke für Zölle: EU-Länder gemeinsam, sonst jedes Land für sich
  const EU = new Set(['FR', 'ES', 'IT', 'PT', 'NL', 'DE', 'AT', 'IE', 'DK', 'GR', 'BE', 'PL', 'SE', 'FI', 'CZ', 'HU', 'RO', 'BG', 'HR', 'LV', 'LT', 'EE', 'MT', 'CY']);
  const blocOf = (cc) => (EU.has(cc) ? 'EU' : cc === 'HK' ? 'CN' : cc);
  const MAKER_BLOC = { Airbus: 'EU', ATR: 'EU', Boeing: 'US', Embraer: 'BR', 'De Havilland Canada': 'CA' };
  const makerBloc = (typeId) => MAKER_BLOC[P.AIRCRAFT_TYPES[typeId].maker] || 'EU';
  const blocName = (b) => (b === 'EU' ? 'der EU' : (COUNTRY_DATA[b] ? COUNTRY_DATA[b].dat : b));
  const tariffKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  function tariffBetween(w, a, b) { if (!w || a === b) return 0; return (w.macro.tariffs && w.macro.tariffs[tariffKey(a, b)]) || 0; }
  /** Zollaufschlag auf ein Flugzeug für eine Airline (Heimatland der ersten Basis gegen Herstellerland). */
  function acTariff(w, al, typeId) { return al && al.bases && al.bases.length ? tariffBetween(w, blocOf(ap(al.bases[0]).country), makerBloc(typeId)) : 0; }
  /** Lieferzeit bei Leasinggebern und Herstellern: Wer viel bestellt, verlängert die Warteschlange für alle. */
  function leaseDelivery(w, typeId, mode) {
    const q = (w && w.lessorQueue && w.lessorQueue[typeId]) || 0;
    if (mode === 'factory') return P.FACTORY_DELIVERY_DAYS + Math.min(360, 30 * Math.floor(q / 6));
    return P.LEASE_DELIVERY_DAYS + Math.min(70, 7 * Math.floor(q / 4));
  }
  const ACADEMY = {
    pilot: { label: 'Flugschule', ramp: 120, cost: [0, 60000, 120000, 220000], out: [0, 2, 4, 7] },
    cabin: { label: 'Kabinenakademie', ramp: 60, cost: [0, 25000, 50000, 90000], out: [0, 4, 8, 14] },
    tech: { label: 'Technikschule', ramp: 90, cost: [0, 20000, 40000, 75000], out: [0, 1, 2, 4] },
  };
  function milestoneCtx(w, al) {
    const routes = al.activeRoutes(), regions = new Set(), cs = new Set();
    for (const r of routes) for (const x of [r.base, r.dest]) { regions.add(ap(x).region); cs.add(ap(x).country); }
    const res = al.ledger.months.map((m) => { let s = 0; for (const k in m.acc) if (!k.startsWith('cf_')) s += m.acc[k]; return s; });
    const crisis = w.events.some((e) => (e.type === 'health' || (e.type === 'recession' && e.countries.length > 10) || e.type === 'fuel_spike') && e.start <= w.day && e.end > w.day);
    return { w, al, routes, regions, cs, res, crisis, bs: balanceSheet(al), pax: al.paxTotal || 0 };
  }
  const MILESTONES = [
    { id: 'first', label: 'Erstflug', desc: 'Die erste Strecke ist in der Luft.', pts: 10, brand: 0.01, test: (c) => c.routes.some((r) => r.opened_day <= c.w.day) && c.pax > 0 },
    { id: 'pax100k', label: '100.000 Passagiere', desc: 'Insgesamt 100.000 Fluggäste befördert.', pts: 15, brand: 0.01, test: (c) => c.pax >= 1e5 },
    { id: 'pax1m', label: 'Eine Million Passagiere', desc: 'Insgesamt eine Million Fluggäste.', pts: 30, brand: 0.02, test: (c) => c.pax >= 1e6 },
    { id: 'pax10m', label: 'Zehn Millionen Passagiere', desc: 'Eine Größe am Markt.', pts: 60, brand: 0.03, test: (c) => c.pax >= 1e7 },
    { id: 'profit1', label: 'Schwarze Zahlen', desc: 'Erster Monat mit Gewinn.', pts: 15, brand: 0.01, test: (c) => c.res.some((x) => x > 0) },
    { id: 'profit3', label: 'Drei Gewinnmonate in Folge', desc: 'Stabil profitabel.', pts: 30, brand: 0.02, test: (c) => c.res.length >= 3 && c.res.slice(-3).every((x) => x > 0) },
    { id: 'profit12', label: 'Ein Jahr im Plus', desc: 'Zwölf Gewinnmonate in Folge.', pts: 80, brand: 0.03, test: (c) => c.res.length >= 12 && c.res.slice(-12).every((x) => x > 0) },
    { id: 'crisis', label: 'Krisenfest', desc: 'Gewinnmonat mitten in einer Krise.', pts: 40, brand: 0.02, test: (c) => c.crisis && c.res.length && c.res[c.res.length - 1] > 0 },
    { id: 'fleet5', label: 'Kleine Flotte', desc: 'Fünf Flugzeuge.', pts: 10, test: (c) => c.al.fleet.length >= 5 },
    { id: 'fleet15', label: 'Regionale Größe', desc: '15 Flugzeuge.', pts: 25, brand: 0.01, test: (c) => c.al.fleet.length >= 15 },
    { id: 'fleet40', label: 'Netzwerk-Airline', desc: '40 Flugzeuge.', pts: 60, brand: 0.02, test: (c) => c.al.fleet.length >= 40 },
    { id: 'routes10', label: 'Zehn Strecken', desc: 'Zehn Strecken gleichzeitig.', pts: 15, test: (c) => c.routes.length >= 10 },
    { id: 'routes30', label: 'Dreißig Strecken', desc: 'Ein dichtes Netz.', pts: 40, brand: 0.01, test: (c) => c.routes.length >= 30 },
    { id: 'long', label: 'Langstrecke', desc: 'Eine Strecke über 5.000 km.', pts: 20, brand: 0.01, test: (c) => c.routes.some((r) => gcDistanceKm(r.base, r.dest) > 5000 && r.opened_day <= c.w.day) },
    { id: 'africa', label: 'Afrika verbunden', desc: 'Eine Strecke nach Afrika.', pts: 15, test: (c) => c.regions.has('Afrika') },
    { id: 'world3', label: 'Drei Kontinente', desc: 'Flughäfen in drei Weltregionen.', pts: 25, brand: 0.01, test: (c) => c.regions.size >= 3 },
    { id: 'world5', label: 'Weltweit', desc: 'Flughäfen in fünf Weltregionen.', pts: 60, brand: 0.02, test: (c) => c.regions.size >= 5 },
    { id: 'countries10', label: 'Zehn Länder', desc: 'Flughäfen in zehn Ländern.', pts: 25, test: (c) => c.cs.size >= 10 },
    { id: 'ratingA', label: 'Bestnote der Bank', desc: 'Rating A.', pts: 50, brand: 0.02, test: (c) => c.al.rating === 'A' },
    { id: 'equity2', label: 'Wert verdoppelt', desc: 'Eigenkapital doppelt so hoch wie zum Start.', pts: 70, brand: 0.02, test: (c) => c.bs.equity >= 2 * c.al.ledger.equityContrib / 100 },
    { id: 'alliance', label: 'Partner gefunden', desc: 'Codeshare oder Allianz geschlossen.', pts: 15, brand: 0.01, test: (c) => c.w.coopsOf(c.al.id).length > 0 },
    { id: 'auction', label: 'Erstkunde', desc: 'Eine Auktion um Lieferpositionen gewonnen.', pts: 20, brand: 0.01, test: (c) => (c.w.auctions || []).some((a) => a.winners && a.winners.includes(c.al.id)) },
    { id: 'academy', label: 'Eigener Nachwuchs', desc: 'Eine Akademie gefördert.', pts: 15, test: (c) => c.al.academy && Object.values(c.al.academy).some((x) => x.lv > 0) },
    { id: 'hub', label: 'Drehkreuz', desc: 'Zwei Basen.', pts: 20, brand: 0.01, test: (c) => c.al.bases.length >= 2 },
  ];
  // ---------------------------------------------------------------------------
  // Karriere (Spielphasen)
  // ---------------------------------------------------------------------------
  const CAREER = P.CAREER;
  const careerLv = (al) => (al && al.prog ? clamp(al.prog.lv | 0, 0, CAREER.levels.length - 1) : null);
  const careerOf = (al) => { const lv = careerLv(al); return lv === null ? null : CAREER.levels[lv]; };
  /** Ab welcher Phase ein Muster freigeschaltet ist. */
  function typeLevel(type) { for (let i = 0; i < CAREER.levels.length; i++) { const t = CAREER.levels[i].types; if (t === 'all' || t.includes(type)) return i; } return CAREER.levels.length - 1; }
  function typeAllowed(al, type) { const lv = careerLv(al); return lv === null || typeLevel(type) <= lv || al.fleet.some((x) => x.type_id === type); }
  function needTxt(n) {
    if (!n) return '';
    const out = [];
    if (n.fleet) out.push(`${n.fleet} Flugzeuge`);
    if (n.days) out.push(`${Math.round(n.days / 30)} Monate am Markt`);
    if (n.profit) out.push(n.profit === 1 ? 'ein Gewinnmonat' : `${n.profit} Gewinnmonate`);
    if (n.routes) out.push(`${n.routes} Strecken`);
    if (n.equity) out.push(n.equity === 1 ? 'Eigenkapital mindestens auf Startniveau' : `Eigenkapital ${String(n.equity).replace('.', ',')}× Start`);
    if (n.pax) out.push(n.pax >= 1e6 ? `${n.pax / 1e6} Mio. Fluggäste` : `${n.pax / 1e3} Tsd. Fluggäste`);
    return out.join(', ');
  }
  /** Fehlermeldung für ein noch gesperrtes Muster (oder null). */
  function careerTypeMsg(al, type) {
    if (typeAllowed(al, type)) return null;
    const i = typeLevel(type), L = CAREER.levels[i];
    return `${P.AIRCRAFT_TYPES[type].label} gibt es ab Phase ${i + 1} „${L.label}“ (${needTxt(L.need)}). Aktuell: Phase ${careerLv(al) + 1} „${careerOf(al).label}“.`;
  }
  /** Bedingungen für die nächste Phase mit Ist-Werten. */
  function careerChecks(w, al) {
    const lv = careerLv(al); if (lv === null || lv >= CAREER.levels.length - 1) return null;
    const next = CAREER.levels[lv + 1], n = next.need, out = [];
    const startEq = (DIFFICULTY[al.difficulty] || DIFFICULTY.normal).equity;
    const profitMonths = al.ledger.months.filter((m) => { let s = 0; for (const k in m.acc) if (!k.startsWith('cf_')) s += m.acc[k]; return s > 0; }).length;
    if (n.fleet) out.push({ k: 'fleet', label: 'Flugzeuge', have: al.fleet.length, need: n.fleet });
    if (n.days) out.push({ k: 'days', label: 'Monate am Markt', have: Math.floor((w.day - (al.joinedDay || 0)) / 30), need: Math.round(n.days / 30) });
    if (n.profit) out.push({ k: 'profit', label: 'Gewinnmonate', have: profitMonths, need: n.profit });
    if (n.routes) out.push({ k: 'routes', label: 'Strecken', have: al.activeRoutes().length, need: n.routes });
    if (n.equity) out.push({ k: 'equity', label: 'Eigenkapital', have: Math.round(balanceSheet(al).equity), need: Math.round(n.equity * startEq), money: true });
    if (n.pax) out.push({ k: 'pax', label: 'Fluggäste gesamt', have: Math.round(al.paxTotal || 0), need: n.pax });
    for (const c of out) c.ok = c.have >= c.need;
    return { lv, next: lv + 1, label: next.label, checks: out, ready: out.every((c) => c.ok) };
  }
  /** Was eine Phase freischaltet (Text). */
  function careerUnlockTxt(i) {
    const L = CAREER.levels[i], parts = [];
    if (L.types === 'all') parts.push('alle Flugzeugmuster (A380, 747, Concorde)');
    else parts.push(L.types.map((t) => P.AIRCRAFT_TYPES[t].label).join(', '));
    parts.push(L.bases >= 99 ? 'beliebig viele Basen' : `${L.bases} Basen${L.basePax < 999 ? ` (bis ${L.basePax} Mio. Passagiere)` : ''}`);
    if (L.hub) parts.push(P.HUB[L.hub].label);
    parts.push(L.acq >= 99 ? 'Flottenzugang ohne Grenze' : `${L.acq} neue Flugzeuge je 30 Tage`);
    if (L.ma && !(i > 0 && CAREER.levels[i - 1].ma)) parts.push('Übernahmen (M&A)');
    return parts.join(' · ');
  }
  function careerAcqLeft(w, al) {
    const L = careerOf(al); if (!L) return Infinity;
    const recent = (al.prog.acq || []).filter((d) => d > w.day - 30).length;
    return Math.max(0, L.acq - recent);
  }
  /** Konditionen bei Leasinggebern und Banken: je größer das Muster im Verhältnis zur Phase, desto teurer. */
  function riskTerms(al, typeId) {
    const lv = careerLv(al), R = CAREER.risk;
    if (lv === null || !al.isPlayer) return { ...R[0], gap: 0 };
    const gap = clamp(typeLevel(typeId) - lv, 0, R.length - 1);
    return { ...R[gap], gap };
  }
  const baseSetupCost = (w, apt) => { const B = P.BASE_COST; return Math.round((B.setupMin + B.setupK * Math.max(0.3, ap(apt).pax || 0.3) ** B.setupExp) * w.macro.cpi / 1000) * 1000; };
  const baseDayCost = (apt) => { const B = P.BASE_COST; return B.dayMin + B.dayK * Math.max(0.3, ap(apt).pax || 0.3) ** B.dayExp; };
  function careerNoteAcq(w, al) { if (!al.prog) return; al.prog.acq = [...(al.prog.acq || []).filter((d) => d > w.day - 30), w.day]; }
  /** Startbasis im Karrieremodus: nur Regionalflughäfen. */
  function startBaseMsg(w, base) {
    if (!P.AIRPORTS[base]) return 'Bitte eine Heimatbasis wählen.';
    return null;   // Start überall möglich – große Flughäfen sind nur deutlich teurer
  }

  /**
   * Tage bis neue Leute anfangen: Grundwert je Rolle, kürzer mit Personal-Fachkraft, länger bei angespanntem Markt
   * (höchstens +50 %). In der Gründungsphase einer Airline höchstens foundingLead Tage.
   */
  function hireLead(w, al, role) {
    const S = P.STAFF, t = w.macro.laborTight || 1;
    const f = Math.min(S.leadMaxFactor, role === 'pilot' ? 1 + 0.5 * (t - 1) : 1 + 0.2 * (t - 1));
    const l = Math.max(1, Math.round(S.lead[role] * lv3([1, 0.75, 0.6, 0.5], al.skill('hr')) * f));
    return w.day - (al.joinedDay || 0) < S.foundingDays ? Math.min(S.foundingLead, l) : l;
  }
  /** Gemeinsamer Arbeitsmarkt je Monat: Wie viele Einstellungen es für alle Mitspielenden zusammen gibt. */
  function laborPool(w, role) {
    const tight = role === 'pilot' ? w.macro.laborTight : 1 + (w.macro.laborTight - 1) * 0.4, month = Math.floor(w.day / 30);
    const used = w.labor && w.labor.m === month ? w.labor[role] || 0 : 0;
    const S = P.STAFF;
    return { pool: Math.floor((S.marketPool[role] + S.marketPerAirline[role] * Math.max(1, w.humans.length)) / tight), used };
  }
  /** Wie viele Flugzeuge eines Typs Leasinggeber auf Lager haben (gemeinsam für alle Airlines). */
  /** Leasingbestand je Muster wächst mit der Zahl der Spielenden (Hauptwelt: mehr Nachfrage, mehr Leasinggeber). */
  const capOf = (w, typeId) => Math.round(stockCap(typeId) * (1 + 0.2 * Math.min(20, Math.max(0, ((w && w.humans) ? w.humans.length : 1) - 1))));
  function stockCap(typeId) { const t = P.AIRCRAFT_TYPES[typeId]; if (t.stock !== undefined) return t.stock; if (['A20N', 'B38M', 'A21N'].includes(typeId)) return 10; return t.ill.kind === 'wide' ? 3 : 5; }
  const REGION_PHASE = { Europa: 0, Nordamerika: 0.6, Lateinamerika: 1.4, Nahost: 2.0, Afrika: 2.6, Asien: 3.3, Ozeanien: 4.0 };
  const EXPERT_MISS = { analyst: 'Marktprognose daneben', revenue: 'Tarifstrategie verfehlt', procurement: 'ungünstigen Liefervertrag abgeschlossen', ops: 'Fehlplanung in der Einsatzsteuerung', tech: 'Wartungsintervalle falsch eingeschätzt', hr: 'Gespräche mit der Belegschaft verpatzt', finance: 'Bankgespräch lief schlecht', marketing: 'Kampagne ging am Publikum vorbei' };
  const EXPERT_LUCK = { analyst: 'Trend früh erkannt', revenue: 'Tarife genau getroffen', procurement: 'Top-Konditionen ausgehandelt', ops: 'Umläufe glänzend gesteuert', tech: 'Ausfälle vorausschauend verhindert', hr: 'Team begeistert', finance: 'Bank überzeugt', marketing: 'Kampagne ging viral' };
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
      this.deals = []; this.dealCounter = 0; this.agreements = []; this.coops = []; this.auctions = [];
      this.lessorQueue = {}; this.labor = { m: 0, pilot: 0, cabin: 0, tech: 0, aiAc: 0 }; this.lessorStock = {};
      Object.assign(this.macro, { tariffs: {}, carbon: {}, feeMult: {}, wage: 1, fuelPressure: 0, cycle: { phase: 0, period: 54, amp: 0.08 } });
    }
    get fuelPrice() { return this.macro.fuelUsd / this.macro.eurusd; }
    add(al) { this.airlines[al.id] = al; this.order.push(al.id); return al; }
    get list() { return this.order.map((k) => this.airlines[k]); }
    get player() { return this.playerId ? this.airlines[this.playerId] : null; }
    get humans() { return this.list.filter((al) => al.isPlayer); }
    pushNews(day, msg, kind, airline, eid = null) { this.news.push(eid ? { day, msg, kind, airline, eid } : { day, msg, kind, airline }); if (this.news.length > 250) this.news.shift(); }

    econFactor(o, d, seg) {
      const e = Math.sqrt((this.macro.econ[ap(o).country] ?? 1) * (this.macro.econ[ap(d).country] ?? 1)) ** P.CHOICE[seg].econ;
      const t = tariffBetween(this, blocOf(ap(o).country), blocOf(ap(d).country));
      return t ? e * (1 - t * (seg === 'business' ? 1.1 : seg === 'leisure' ? 0.3 : 0.15)) : e;
    }
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
      this.pushNews(this.day, (lead > 0 ? 'Angekündigt: ' : '') + e.text, e.severity || 'event', null, e.id);
      if (e.severity !== 'good') for (const h of this.humans) h.log(this.day, e.text, e.severity === 'crit' ? 'crit' : 'warn');
      return e;
    }
    /** Zölle ergeben sich aus den laufenden Handelskriegen. */
    recalcTariffs() {
      const tf = {};
      for (const e of this.events) if (e.type === 'trade_war' && e.start <= this.day && e.end > this.day) { const k = tariffKey(e.blocs[0], e.blocs[1]); tf[k] = Math.max(tf[k] || 0, e.rate); }
      this.macro.tariffs = tf;
    }
    /**
     * Spielleitung: Ereignis annullieren. Angekündigte Ereignisse fallen aus, laufende enden sofort;
     * dauerhafte Folgen (Steuern, Entgelte, CO₂, Zins, Wechselkurs, Kerosinsprung) werden zurückgenommen.
     */
    cancelEvent(eid, by = 'Spielleitung') {
      const e = this.events.find((x) => x.id === eid), day = this.day, M = this.macro;
      if (!e) return { ok: false, msg: 'Ereignis nicht gefunden (vielleicht schon zu alt).' };
      if (e.cancelled) return { ok: false, msg: 'Dieses Ereignis ist schon annulliert.' };
      if (e.end + (e.recovery || 0) <= day && !['tax_change', 'carbon', 'fee_hike', 'rate_change', 'fx_shock', 'fuel_spike', 'fuel_drop', 'trade_deal'].includes(e.type)) return { ok: false, msg: 'Dieses Ereignis ist schon vorbei.' };
      const started = e.start <= day, months = Math.max(0, (day - e.start) / 30);
      if (e.applied) {
        if (e.taxDelta) for (const c of e.countries) M.taxDelta[c] -= e.taxDelta;
        if (e.type === 'carbon') M.carbon[e.bloc] = Math.max(0, (M.carbon[e.bloc] || 0) - e.add);
        if (e.type === 'fee_hike') for (const a of e.airports) M.feeMult[a] = (M.feeMult[a] || 1) / e.fee;
      }
      if (started) {
        if (e.fuelF) M.fuelUsd /= Math.pow(e.fuelF, Math.pow(0.88, months));   // der Preis hat sich schon teilweise erholt
        if (e.refF) M.fuelRefUsd /= e.refF;
        if (e.rateD) M.rate = clamp(M.rate - e.rateD, 0, 0.08);
        if (e.fxF) M.eurusd /= e.fxF;
        if (e.type === 'pilot_shortage') M.laborTight = Math.min(M.laborTight, Math.max(1, e.laborPrev ?? 1));
        if (e.type === 'recession' || e.type === 'boom') for (const c of e.countries || []) if (M.econ[c] !== undefined) M.econ[c] += (e.type === 'recession' ? 1 : -1) * (e.depth || e.boost || 0.06) * (1 - Math.pow(0.7, months));
        if (e.type === 'trade_deal' && e.warId) { const war = this.events.find((x) => x.id === e.warId); if (war && e.warEnd > day) war.end = e.warEnd; }
      }
      if (e.type === 'own_strike') e.averted = true;
      for (const al of this.humans) if (al.decisions) al.decisions = al.decisions.filter((d) => d.eventId !== e.id);
      e.cancelled = true; e.recovery = 0; e.end = Math.min(e.end, day); if (!started) e.start = day;
      this.recalcTariffs();
      this.pushNews(day, `${by} annulliert: ${e.text}`, 'info', e.airline || null);
      for (const h of this.humans) h.log(day, `${by} hat ein Ereignis annulliert: ${e.text}`, 'info');
      return { ok: true };
    }
    generateMonthlyEvents() {
      const r = this.rng, M = this.macro, mult = this.eventMult, day = this.day;
      const roll = (k) => r.random() < EVENT_TYPES[k].p * mult;
      const nm = (cs) => (cs.length === COUNTRIES.length ? 'der Weltwirtschaft' : cs.map((c) => COUNTRY_NAMES[c]).join(' und '));
      // Kein zweiter Kerosinschock obendrauf, solange der Preis noch deutlich erhöht ist (sonst bis über das Dreifache)
      const fuelHigh = M.fuelUsd > 1.4 * M.fuelRefUsd;
      if (!fuelHigh && roll('oil_crisis')) { const f = r.range(1.55, 1.9); M.fuelUsd *= f; M.fuelRefUsd *= 1.15; this.addEvent({ type: 'fuel_spike', fuelF: f, refF: 1.15, scope: 'all', end: day + 180, text: `Ölkrise: Förderstopp in mehreren Ländern, Kerosin steigt um ${Math.round((f - 1) * 100)} %. Das Preisniveau bleibt dauerhaft höher.`, severity: 'crit' }); }
      else if (!fuelHigh && roll('fuel_spike')) { const f = r.range(1.25, 1.7); M.fuelUsd *= f; this.addEvent({ type: 'fuel_spike', fuelF: f, scope: 'all', end: day + 90, text: `Ölpreisschock: Kerosin steigt um ${Math.round((f - 1) * 100)} %. Der Preis normalisiert sich über mehrere Monate.`, severity: 'crit' }); }
      else if (roll('fuel_drop')) { const f = r.range(0.75, 0.88); M.fuelUsd *= f; this.addEvent({ type: 'fuel_drop', fuelF: f, scope: 'all', end: day + 60, text: `Ölpreis fällt: Kerosin ${Math.round((1 - f) * 100)} % günstiger.`, severity: 'good' }); }
      if (roll('recession')) {
        const cs = [...new Set(r.random() < 0.3 ? COUNTRIES : [r.pick(COUNTRIES), r.pick(COUNTRIES), r.pick(COUNTRIES)])];
        const depth = r.range(0.10, 0.20);
        this.addEvent({ type: 'recession', countries: cs, depth, end: day + 30 + r.int(240, 420), text: `Frühindikatoren brechen ein: Rezession in ${nm(cs)} erwartet. Geschäftsreisen leiden am stärksten.`, severity: cs.length > 3 ? 'crit' : 'warn' }, 30);
      } else if (roll('boom')) {
        const cs = [...new Set([r.pick(COUNTRIES), r.pick(COUNTRIES)])];
        this.addEvent({ type: 'boom', countries: cs, boost: r.range(0.05, 0.10), end: day + 240, text: `Aufschwung in ${nm(cs)}: mehr Geschäftsreisen und Urlaubsbuchungen.`, severity: 'good' });
      }
      if (roll('currency_crisis')) {
        const c = r.pick(['TR', 'BR', 'NG', 'EG', 'ZA', 'IN', 'MX', 'CO', 'KE', 'GH', 'PH', 'ID'].filter((x) => COUNTRIES.includes(x)));
        this.addEvent({ type: 'recession', countries: [c], depth: r.range(0.15, 0.25), end: day + r.int(150, 300), text: `Währungskrise in ${COUNTRY_NAMES[c]}: Die Landeswährung bricht ein, Reisen ins Ausland werden für viele unbezahlbar.`, severity: 'warn' });
      }
      if (roll('trade_war')) {
        const pairs = [['US', 'EU'], ['US', 'CN'], ['EU', 'CN'], ['US', 'MX'], ['US', 'CA'], ['GB', 'EU'], ['CN', 'JP'], ['IN', 'CN'], ['US', 'BR'], ['EU', 'TR'], ['US', 'IN'], ['CN', 'AU']];
        const [A, B] = r.pick(pairs), rate = r.pick([0.10, 0.15, 0.20, 0.25, 0.35]), lead = r.int(15, 45);
        const cs = COUNTRIES.filter((c) => blocOf(c) === A || blocOf(c) === B);
        this.addEvent({ type: 'trade_war', blocs: [A, B], rate, countries: cs, end: day + lead + r.int(180, 600), text: `Handelskrieg: ${blocName(A)} und ${blocName(B)} erheben ab ${lead} Tagen ${Math.round(rate * 100)} % Zölle. Geschäftsreisen und Fracht zwischen beiden brechen ein, Flugzeuge aus dem jeweils anderen Block werden teurer.`, severity: rate >= 0.25 ? 'crit' : 'warn' }, lead);
      }
      if (roll('trade_deal')) {
        const war = this.events.find((e) => e.type === 'trade_war' && e.start <= day && e.end > day + 30);
        if (war) { const warEnd = war.end; war.end = day + 14; this.addEvent({ type: 'trade_deal', warId: war.id, warEnd, scope: 'all', end: day + 15, text: `Handelsabkommen: ${blocName(war.blocs[0])} und ${blocName(war.blocs[1])} heben die Zölle in zwei Wochen auf.`, severity: 'good' }); }
      }
      if (roll('airspace')) {
        const c = r.pick(['RU', 'TR', 'EG', 'SA', 'IN', 'CN', 'NG', 'ET', 'KE', 'DZ', 'MX', 'TN', 'QA', 'AE'].filter((x) => COUNTRIES.includes(x)));
        const lead = r.int(1, 3), dur = r.int(4, 16);
        this.addEvent({ type: 'airspace', countries: [c], end: day + lead + dur, ops: { cancel: 1.0, delay: 0 }, demand: { leisure: 0.7, business: 0.8, vfr: 0.85 }, airports: AP_CODES.filter((x) => ap(x).country === c), text: `Luftraumsperrung über ${COUNTRY_NAMES[c]}: ${dur} Tage keine Flüge von und nach dort.`, severity: 'crit' }, lead);
      }
      if (roll('carbon')) {
        const bloc = r.random() < 0.55 ? 'EU' : r.pick(['GB', 'US', 'CA', 'JP', 'AU', 'KR', 'CN']), add = r.range(0.04, 0.10);
        this.addEvent({ type: 'carbon', bloc, add, scope: 'all', end: day + 61, text: `CO₂-Abgabe: In ${blocName(bloc)} kostet Kerosin ab ${60} Tagen ${Math.round(add * 100)} % mehr – dauerhaft.`, severity: 'warn' }, 60);
      }
      if (roll('fee_hike')) {
        const a = r.pick(AP_CODES.filter((c) => (ap(c).rank || 999) <= 80 || (ap(c).region === 'Afrika' && (ap(c).pax || 0) >= 3) || ['HAM', 'BER', 'DUS', 'VIE'].includes(c))), f = r.range(1.2, 1.5), lead = 30;
        this.addEvent({ type: 'fee_hike', airports: [a], fee: f, end: day + lead + 1, text: `${ap(a).name} erhöht ab ${lead} Tagen Lande- und Passagierentgelte um ${Math.round((f - 1) * 100)} %.`, severity: 'warn' }, lead);
      }
      if (roll('atc_strike')) {
        const c = r.random() < 0.4 ? 'FR' : r.random() < 0.5 ? 'IT' : r.pick(COUNTRIES);
        const lead = r.int(3, 6), dur = r.int(1, 3);
        this.addEvent({ type: 'atc_strike', countries: [c], end: day + lead + dur, ops: { cancel: 0.6, delay: 40 }, text: `Fluglotsenstreik in ${COUNTRY_NAMES[c]}: ${dur} Tag${dur > 1 ? 'e' : ''}, rund 60 % der Flüge fallen aus.`, severity: 'warn' }, lead);
      }
      if (roll('airport_strike')) {
        const a = r.pick(AP_CODES), lead = r.int(2, 4), dur = r.int(1, 2);
        this.addEvent({ type: 'airport_strike', airports: [a], end: day + lead + dur, ops: { cancel: 0.8, delay: 30 }, text: `Warnstreik des Bodenpersonals in ${ap(a).name}: ${dur === 1 ? 'ein Tag' : 'zwei Tage'} mit massiven Ausfällen.`, severity: 'warn' }, lead);
      }
      if (day > 120 && roll('volcano')) {
        const sets = [['HAM', 'BER', 'AMS', 'LHR', 'DUS', 'FRA', 'CPH', 'DUB', 'MAN'], ['FCO', 'ATH', 'IST', 'MUC', 'VIE'], ['NRT', 'HND', 'KIX', 'ICN'], ['MEX', 'CUN', 'BOG', 'LIM']];
        const aps = r.pick(sets).filter((c) => P.AIRPORTS[c]), dur = r.int(3, 8);
        this.addEvent({ type: 'volcano', airports: aps, end: day + dur, ops: { cancel: 1.0, delay: 0 }, text: `Vulkanasche: Luftraum über ${aps.map((x) => ap(x).name).join(', ')} für ${dur} Tage gesperrt.`, severity: 'crit' });
      }
      if (roll('big_event')) {
        const a = r.pick(AP_CODES), lead = r.int(20, 40), dur = r.int(4, 9);
        this.addEvent({ type: 'big_event', airports: [a], end: day + lead + dur, demand: { leisure: 1.35, business: 1.2, vfr: 1.1 }, text: `${BIG_EVENTS[a] || 'Großveranstaltung'} in ${ap(a).name}: ${dur} Tage deutlich mehr Nachfrage.`, severity: 'good' }, lead);
      }
      if (roll('tax_change')) {
        const c = r.pick(COUNTRIES), delta = r.random() < 0.7 ? r.int(4, 15) : -r.int(3, 8), lead = 60;
        this.addEvent({ type: 'tax_change', countries: [c], end: day + lead + 1, taxDelta: delta, text: `Ticketsteuer in ${COUNTRY_NAMES[c]}: In ${lead} Tagen ${delta > 0 ? 'steigt' : 'sinkt'} sie um ${Math.abs(delta)} EUR je Abflug.`, severity: delta > 0 ? 'warn' : 'good' }, lead);
      }
      if (roll('rate_change')) {
        const dd = (r.random() < 0.55 ? 1 : -1) * (r.random() < 0.6 ? 0.0025 : 0.005);
        if (M.rate + dd >= 0 && M.rate + dd <= 0.08) { M.rate += dd; this.addEvent({ type: 'rate_change', rateD: dd, scope: 'all', end: day + 1, text: `Die Zentralbank ${dd > 0 ? 'erhöht' : 'senkt'} den Leitzins auf ${(M.rate * 100).toFixed(2).replace('.', ',')} %. Kredite werden ${dd > 0 ? 'teurer' : 'günstiger'}.`, severity: dd > 0 ? 'warn' : 'good' }); }
      }
      if (day > 200 && roll('health')) {
        this.addEvent({ type: 'health', scope: 'all', end: day + 7 + 75, recovery: 180, demand: { leisure: 0.5, business: 0.45, vfr: 0.65 }, text: 'Gesundheitskrise: weltweite Reisewarnungen. Die Nachfrage bricht für Monate ein und erholt sich langsam.', severity: 'crit' }, 7);
      }
      if (roll('pilot_shortage')) { const laborPrev = M.laborTight; M.laborTight = Math.max(M.laborTight, 2.2); this.addEvent({ type: 'pilot_shortage', laborPrev, scope: 'all', end: day + 180, text: 'Weltweiter Pilotenmangel: Neueinstellungen dauern doppelt so lange, kosten mehr und die Löhne steigen.', severity: 'warn' }); }
      if (roll('fx_shock')) {
        const f = r.random() < 0.5 ? r.range(0.88, 0.95) : r.range(1.05, 1.12);
        M.eurusd *= f;
        this.addEvent({ type: 'fx_shock', fxF: f, scope: 'all', end: day + 1, text: `Der Euro ${f < 1 ? 'fällt' : 'steigt'} deutlich: 1 EUR = ${M.eurusd.toFixed(3).replace('.', ',')} USD. Leasingraten und Kerosin werden in Dollar bezahlt.`, severity: f < 1 ? 'warn' : 'good' });
      }
    }
    dailyEvents() {
      const r = this.rng, m = monthOf(this.day), winter = [9, 10, 11, 0, 1, 2].includes(m);
      if (r.random() < (winter ? 0.014 : 0.006) * this.eventMult) {
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
        if (e.type === 'carbon') this.macro.carbon[e.bloc] = (this.macro.carbon[e.bloc] || 0) + e.add;
        if (e.type === 'fee_hike') for (const a of e.airports) this.macro.feeMult[a] = (this.macro.feeMult[a] || 1) * e.fee;
        e.applied = true;
      }
      this.recalcTariffs();
      if (this.events.length > 160) this.events = this.events.filter((e) => e.end + (e.recovery || 0) > this.day - 60);
    }
    monthlyMacro() {
      const M = this.macro, r = this.rng, day = this.day;
      const C = M.cycle || (M.cycle = { phase: 0, period: 54, amp: 0.08 });
      C.phase += 2 * Math.PI / C.period;
      for (const c of COUNTRIES) {
        if (M.econ[c] === undefined) { M.econ[c] = 1; M.econTarget[c] = 1; M.taxDelta[c] = M.taxDelta[c] || 0; }
        let t = 1 + C.amp * Math.sin(C.phase + (REGION_PHASE[ap(AP_CODES.find((x) => ap(x).country === c)).region] || 0));
        for (const e of this.events) {
          if (e.start > day || e.end <= day || !e.countries || !e.countries.includes(c)) continue;
          if (e.type === 'recession') t -= e.depth;
          if (e.type === 'boom') t += e.boost || 0.06;
        }
        M.econTarget[c] = t;
        M.econ[c] = M.econ[c] + 0.3 * (M.econTarget[c] - M.econ[c]) + r.gauss(0, 0.012);
      }
      // Kerosin: Schwankung, Rückkehr zum Referenzpreis und Druck durch große Absicherungen
      M.fuelUsd *= Math.exp(r.gauss(0, 0.05) + 0.12 * Math.log(M.fuelRefUsd / M.fuelUsd) + 0.5 * (M.fuelPressure || 0));
      M.fuelPressure = (M.fuelPressure || 0) * 0.5;
      M.fuelUsd = clamp(M.fuelUsd, 0.5 * M.fuelRefUsd, 2.2 * M.fuelRefUsd);
      M.eurusd *= Math.exp(r.gauss(0, 0.015) + 0.05 * Math.log(P.EURUSD / M.eurusd));
      M.cpi *= 1 + 0.022 / 12;
      // Arbeitsmarkt: Einstellungen aller Airlines verknappen Personal und treiben die Löhne
      const L = this.labor || { pilot: 0, cabin: 0, tech: 0, aiAc: 0 };
      M.laborTight = Math.min(3, 1 + (M.laborTight - 1) * 0.8 + 0.8 * L.pilot / (P.STAFF.marketPool.pilot + P.STAFF.marketPerAirline.pilot * Math.max(1, this.humans.length)) + (L.aiAc || 0) * 0.004);
      M.wage = (M.wage || 1) * (1 + 0.001 + 0.006 * (M.laborTight - 1));
      { let se = 0, n = 0; for (const c of COUNTRIES) { se += M.econ[c]; n++; } const avg = se / Math.max(1, n);
        const crisis = this.events.some((e) => (e.type === 'health' || (e.type === 'recession' && e.countries.length > 10)) && e.start <= day && e.end > day);
        M.bank = clamp(1 - 2.5 * Math.max(0, 1 - avg) - (crisis ? 0.2 : 0), 0.4, 1.05); }
      // Leasinggeber füllen ihren Bestand nur langsam auf
      for (const [k, t] of Object.entries(P.AIRCRAFT_TYPES)) { if (t.launch && day < t.launch + 365) continue; const cap = capOf(this, k); this.lessorStock[k] = Math.min(cap, (this.lessorStock[k] ?? cap) + Math.ceil(cap * 0.4)); }
      // Akademien entlasten den Arbeitsmarkt
      const acad = this.humans.reduce((s, h) => s + (h.academy ? Object.values(h.academy).reduce((t, x) => t + (x.lv || 0), 0) : 0), 0);
      M.laborTight = Math.max(1, M.laborTight - 0.01 * acad);
      this.labor = { m: Math.floor(day / 30) + 1, pilot: 0, cabin: 0, tech: 0, aiAc: 0 };
      for (const k of Object.keys(this.lessorQueue || {})) { this.lessorQueue[k] *= 0.6; if (this.lessorQueue[k] < 0.5) delete this.lessorQueue[k]; }
    }

    // Slots
    slotUse(apt) {
      let n = 0;
      for (const al of this.list) { if (al.status === 'insolvent') continue; for (const r of al.activeRoutes()) if (r.base === apt || r.dest === apt) n += r.freq; n += al.heldAt(apt, this.day); }
      return n;
    }
    slotsFreeFor(al, apt) { if (this.lockedFor(al, apt)) return 0; const f = this.slotsFree(apt); return f === Infinity ? f : Math.max(0, f - this.waitBlock(apt, al)) + al.heldAt(apt, this.day); }
    /** Freie Slots, auf die andere schon auf der Warteliste stehen (die bekommen sie zuerst). */
    waitBlock(apt, al) { let n = 0; for (const e of this.slotWait || []) if (e.apt === apt && e.al !== (al && al.id)) n += e.n; return n; }
    /** Was neue Slots für eine Strecke kosten: zuerst die eigene Reserve (schon bezahlt), der Rest zum Marktpreis. Nur Spielende zahlen. */
    /** Neue Basis an einem vollen Flughafen: Aus dem Slotpool kommen zwei Plätze dazu (zum Marktpreis zu kaufen) – sonst ginge dort gar nichts. */
    newEntrantSlots(apt) { if (!this.slotCap || !P.AIRPORTS[apt]) return; const f = this.slotsFree(apt); if (f < 2) this.slotCap[apt] = (this.slotCap[apt] || 0) + (2 - Math.max(0, f)); }
    slotCost(al, o, d, n) {
      if (!al.isPlayer || !(n > 0)) return { cost: 0, parts: [] };
      let cost = 0; const parts = [];
      for (const x of [o, d]) { if (apx(x).slots === null) continue; const need = Math.max(0, n - al.heldAt(x, this.day)); if (!need) continue; const c = this.slotBuyPrice(x, need); cost += c; parts.push({ apt: x, n: need, cost: c }); }
      return { cost, parts };
    }
    /** Warteliste: Auf einen Platz für n Slots an einem vollen Flughafen warten. Frei werdende Slots gehen der Reihe nach je einer an jeden Wartenden. */
    joinWait(al, apt, n, plan = null) {
      if (!P.AIRPORTS[apt] || apx(apt).slots === null) return { ok: false, msg: 'Slots gibt es nur an koordinierten Flughäfen.' };
      n = clamp(Math.round(Number(n) || 0), 1, 20);
      this.slotWait = this.slotWait || [];
      const mine = this.slotWait.find((e) => e.al === al.id && e.apt === apt && (e.plan || null) === plan);
      if (mine) { mine.n = plan ? n : Math.min(20, mine.n + n); return { ok: true, id: mine.id, pos: this.waitPos(mine) }; }
      if (this.slotWait.filter((e) => e.al === al.id).length >= 12) return { ok: false, msg: 'Höchstens zwölf Wartelisten-Einträge gleichzeitig.' };
      const e = { id: 'W' + (this.waitCounter = (this.waitCounter || 0) + 1), al: al.id, apt, n, day: this.day, plan: plan || undefined };
      this.slotWait.push(e);
      al.log(this.day, `Warteliste ${ap(apt).name}: ${n} Slot${n > 1 ? 's' : ''} angefragt (Platz ${this.waitPos(e)})`, 'route');
      return { ok: true, id: e.id, pos: this.waitPos(e) };
    }
    waitPos(e) { const q = (this.slotWait || []).filter((x) => x.apt === e.apt); return q.indexOf(e) + 1; }
    leaveWait(al, id) { const before = (this.slotWait || []).length; this.slotWait = (this.slotWait || []).filter((e) => !(e.id === id && e.al === al.id)); return before !== this.slotWait.length ? { ok: true } : { ok: false, msg: 'Eintrag nicht gefunden.' }; }
    /** Täglich: freie Slots fair an die Warteliste verteilen (reihum je einer, zum aktuellen Preis). */
    allocateWaitlist() {
      if (!this.slotWait || !this.slotWait.length) return;
      this.slotWait = this.slotWait.filter((e) => this.airlines[e.al] && this.airlines[e.al].status !== 'insolvent' && e.n > 0);
      for (const apt of [...new Set(this.slotWait.map((e) => e.apt))]) {
        let free = this.slotsFree(apt), guard = 0;
        while (free > 0 && guard++ < 50) {
          const q = this.slotWait.filter((e) => e.apt === apt && e.n > 0 && !e.skip); if (!q.length) break;
          let gave = false;
          for (const e of q) {
            if (free <= 0) break;
            const al = this.airlines[e.al], price = this.slotBuyPrice(apt, 1);
            if (al.spendable(this.macro.bank ?? 1) < price) { if (!e.warned) { al.log(this.day, `Warteliste ${ap(apt).name}: Ein Slot wäre frei, aber für ${Math.round(price / 1000)} Tsd. EUR reicht das Geld nicht – Sie bleiben auf der Liste`, 'warn'); e.warned = true; } e.skip = true; continue; }
            al.slotInvest(apt, price, 1); al.hold(apt, 1, 0, true); e.n--; free--; gave = true; delete e.warned;
            al.log(this.day, `Warteliste ${ap(apt).name}: 1 Slot zugeteilt (${Math.round(price / 1000)} Tsd. EUR)${e.n ? `, ${e.n} noch offen` : ''}`, 'good');
          }
          if (!gave) break;
        }
        for (const e of this.slotWait) delete e.skip;
      }
      this.slotWait = this.slotWait.filter((e) => e.n > 0);
    }
    /** Geplante Strecken: fehlende Slots pro Flughafen. */
    planMissing(al, pl) {
      const r = pl.route ? al.routes.find((x) => x.id === pl.route && !x.closed) : null, n = r ? Math.max(0, pl.freq - r.freq) : pl.freq, out = {};
      if (pl.route && !r) return null;
      for (const x of [pl.base, pl.dest]) { if (apx(x).slots === null) continue; const have = this.slotsFreeFor(al, x); if (have < n) out[x] = n - have; }
      return out;
    }
    /** Täglich: geplante Strecken prüfen und – wenn gewünscht – umsetzen, sobald die Slots da sind. */
    checkPlans(al) {
      if (!al.plans || !al.plans.length) return;
      for (const pl of al.plans.slice()) {
        const miss = this.planMissing(al, pl);
        if (miss === null) { al.plans = al.plans.filter((x) => x !== pl); continue; }
        if (Object.keys(miss).length) continue;
        if (!pl.auto) { if (!pl.ready) { pl.ready = true; al.log(this.day, `Plan ${pl.base}–${pl.dest} (${pl.freq}x täglich) ist jetzt umsetzbar – die Slots sind da`, 'good'); } continue; }
        const res = this.runPlan(al, pl.id);
        if (!res.ok && !pl.failed) { pl.failed = true; al.log(this.day, `Plan ${pl.base}–${pl.dest}: Slots sind da, aber ${res.msg || 'die Umsetzung klappt noch nicht'}`, 'warn'); }
      }
    }
    runPlan(al, id) {
      const pl = (al.plans || []).find((x) => x.id === id); if (!pl) return { ok: false, msg: 'Plan nicht gefunden.' };
      const res = pl.route ? applyAction(this, al.id, { type: 'editRoute', id: pl.route, freq: pl.freq })
        : applyAction(this, al.id, { type: 'openRoute', base: pl.base, dest: pl.dest, typeId: pl.type, freq: pl.freq, fo: pl.fo, fi: pl.fi, service: pl.service, buffer: pl.buffer, term: pl.term });
      const done = res.ok && !(pl.route && /Keine freien Slots/.test(res.msg || ''));
      if (done) {
        al.plans = al.plans.filter((x) => x !== pl); this.slotWait = (this.slotWait || []).filter((e) => e.plan !== pl.id);
        al.log(this.day, `Plan umgesetzt: ${pl.base}–${pl.dest} ${pl.freq}x täglich`, 'route');
        return { ...res, ok: true };
      }
      return { ok: false, msg: res.msg || 'Nicht möglich.' };
    }
    savePlan(al, a) {
      al.plans = al.plans || [];
      if (al.plans.length >= 12) return { ok: false, msg: 'Höchstens zwölf Pläne gleichzeitig.' };
      const route = a.route ? al.routes.find((x) => x.id === a.route && !x.closed) : null;
      if (a.route && !route) return { ok: false, msg: 'Strecke nicht gefunden.' };
      const base = route ? route.base : String(a.base || ''), dest = route ? route.dest : String(a.dest || '');
      const type = route ? route.type_id : String(a.typeId || ''), freq = clamp(Math.round(num(a.freq, 1)), 1, 8);
      if (!al.bases.includes(base) || !P.AIRPORTS[dest] || base === dest || !P.AIRCRAFT_TYPES[type]) return { ok: false, msg: 'Ungültige Strecke.' };
      if (!routeKmOk(base, dest) || !rangeOk(base, dest, type)) return { ok: false, msg: 'Diese Strecke geht mit dem Muster nicht.' };
      if (route && freq <= route.freq) return { ok: false, msg: `Die Strecke fliegt schon ${route.freq}x täglich.` };
      if (!route && al.activeRoutes().some((r) => pairKey(r.base, r.dest) === pairKey(base, dest))) return { ok: false, msg: 'Diese Strecke fliegen Sie schon – planen Sie dort eine höhere Frequenz.' };
      if (al.plans.some((x) => pairKey(x.base, x.dest) === pairKey(base, dest))) return { ok: false, msg: 'Für diese Strecke gibt es schon einen Plan.' };
      const pl = { id: 'PL' + (this.waitCounter = (this.waitCounter || 0) + 1), base, dest, type, freq, route: route ? route.id : undefined, day: this.day, auto: a.auto !== false,
        fo: clamp(num(a.fo, refPrice(base, dest, this.macro.cpi)), 10, 5000), fi: clamp(num(a.fi, refPrice(dest, base, this.macro.cpi)), 10, 5000),
        service: P.SERVICE[a.service] ? a.service : 'standard', buffer: P.BUFFER_POLICY[a.buffer] ? a.buffer : 'normal', term: P.TERMINALS[a.term] ? a.term : undefined };
      al.plans.push(pl);
      const miss = this.planMissing(al, pl), waits = [];
      if (a.wait !== false) for (const [x, n] of Object.entries(miss || {})) { const r = this.joinWait(al, x, n, pl.id); if (r.ok) waits.push(`${x} Platz ${r.pos}`); }
      al.log(this.day, `In Planung: ${base}–${dest} ${freq}x täglich${Object.keys(miss || {}).length ? ` – es fehlen Slots (${Object.entries(miss).map(([x, n]) => `${x}: ${n}`).join(', ')})${waits.length ? ', Warteliste ' + waits.join(', ') : ''}` : ''}`, 'route');
      return { ok: true, id: pl.id, missing: miss, waits };
    }
    deletePlan(al, id) {
      const pl = (al.plans || []).find((x) => x.id === id); if (!pl) return { ok: false, msg: 'Plan nicht gefunden.' };
      al.plans = al.plans.filter((x) => x !== pl); this.slotWait = (this.slotWait || []).filter((e) => e.plan !== id);
      return { ok: true };
    }
    /** Exklusivvertrag (alle Gates) an einem Flughafen ohne Slotkoordination: Inhaber oder null. */
    lockOwner(apt) { for (const x of this.list) if (x.status !== 'insolvent' && x.gateLock && x.gateLock[apt]) return x; return null; }
    lockedFor(al, apt) { const o = this.lockOwner(apt); return !!o && o !== al; }
    slotsOkFor(al, o, d, extra) { return this.slotsFreeFor(al, o) >= extra && this.slotsFreeFor(al, d) >= extra; }
    takeSlots(al, o, d, n) { for (const x of [o, d]) if (apx(x).slots !== null) al.useHeld(x, n, this.day); }
    slotsFree(apt) { if (apx(apt).slots === null) return Infinity; return (this.slotCap[apt] ?? 0) - this.slotUse(apt); }
    slotsOk(o, d, extra) { return this.slotsFree(o) >= extra && this.slotsFree(d) >= extra; }
    initSlots() { for (const c of AP_CODES) this.slotCap[c] = Math.max(apx(c).simCap, this.slotUse(c)); this.slotV = 2; }

    // Kosten je Flug
    fuelAvg() { const h = this.fuelHist.slice(-365); return h.length ? h.reduce((a, b) => a + b, 0) / h.length : this.fuelPrice; }
    fuelPriceFor(al, o) {
      const spot = this.fuelPrice * apx(o).fuel * (1 + ((this.macro.carbon || {})[blocOf(ap(o).country)] || 0)) * (this.coopFuel(al) ? 0.98 : 1);
      if (!al.isPlayer) return 0.5 * spot + 0.5 * this.fuelAvg() * apx(o).fuel;
      const disc = 1 - lv3([0, 0.02, 0.04, 0.06], al.skill('procurement'));
      return spot * disc;   // Absicherung wird getrennt als Swap abgerechnet (settleHedge)
    }
    ageOf(al, r) {
      const acs = al.fleet.filter((a) => a.assigned && a.assigned.includes(r.id));
      if (!acs.length) return P.AIRCRAFT_TYPES[r.type_id].age;
      return acs.reduce((s, a) => s + al.acAge(a, this.day) * (a.cond || 1), 0) / acs.length;
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
        if (r.opened_day === undefined || this.day - r.opened_day < P.ROUTE_INCENTIVE.days) { c.pax_fees *= 1 - incentiveAt(o); c.landing *= 1 - incentiveAt(d); }
      }
      c.maintenance *= maintF;
      const fm = this.macro.feeMult || {};
      if (fm[d]) c.landing *= fm[d];
      if (fm[o]) { c.pax_fees *= fm[o]; c.handling *= 1 + (fm[o] - 1) * 0.5; }
      if (!al.isPlayer || forecast) c.crew *= this.macro.wage || 1;
      if (!al.isPlayer) { const cf = rivalsOf(this).cost; for (const k of ['fuel', 'maintenance', 'handling', 'crew']) if (c[k]) c[k] *= cf; }
      if (al.isPlayer && forecast) c._crewSal = (pilotsFor(c._bh) * al.staffHourly('pilot', t.group) + t.cabin * al.staffHourly('cabin')) * c._bh * cpi * (this.macro.wage || 1);
      return c;
    }
    // Kooperationen (Codeshare auf einer Strecke, Allianz im ganzen Netz)
    coopsOf(alId) { return (this.coops || []).filter((c) => c.until > this.day && (c.a === alId || c.b === alId)); }
    coopFuel(al) { return this.coopsOf(al.id).some((c) => c.kind === 'alliance'); }
    codeshareFreq(al, pair) {
      let f = 0;
      for (const c of this.coopsOf(al.id)) {
        if (c.kind === 'codeshare' && c.pair !== pair) continue;
        const partner = this.airlines[c.a === al.id ? c.b : c.a];
        if (!partner || partner.status === 'insolvent') continue;
        for (const r of partner.activeRoutes()) if (pairKey(r.base, r.dest) === pair) f += r.flyingToday || 0;
      }
      return f;
    }
    /** Prognose für den Spieler mit seiner Kostenstruktur (Personal als Stundensatz, Stationen, Marke, Studien). */
    forecastFor(al, spec, opts = {}) {
      if (spec.cab === undefined) spec = { ...spec, cab: cabClone(al.cabinCfg()) };
      if (spec.wk > 0 && spec.wk < 7) spec = { ...spec, freq: spec.wk / 7 };   // seltener als täglich: im Mittel wk/7 Flüge am Tag
      const co = this.competitorOffers(al.id, spec.base, spec.dest), ci = this.competitorOffers(al.id, spec.dest, spec.base);
      const trend = this.knownTrend(al, spec.base, spec.dest);
      const kn = opts.exact || !al.isPlayer ? null : (opts.know || this.knowOf(al, spec.base, spec.dest));
      const bias = kn ? this.knowBias(al, spec.base, spec.dest, kn) : 1;
      const r = { ...spec, age: opts.age };
      const rotH = rotationHours(spec.base, spec.dest, spec.type_id, spec.service, spec.buffer, al.turnExtra(spec.base), al.turnExtra(spec.dest));
      const t = P.AIRCRAFT_TYPES[spec.type_id];
      const dayFixed = t.value_eur * P.INSURANCE[al.insurance].rate / 365 + ovhAc(spec.type_id) * this.macro.cpi + t.lease_month * (al.fleet.some((x) => x.type_id === spec.type_id) ? 1 : riskTerms(al, spec.type_id).lease) * (P.EURUSD / this.macro.eurusd) * 12 / 365
        + P.STAFF.techPerAc * P.STAFF.techSalary * (al.staff ? al.staff.pay : 1) * this.macro.cpi / 30.4;
      let slotFee = 0; for (const x of [spec.base, spec.dest]) slotFee += apx(x).slotFee * spec.freq * this.macro.cpi;
      let crewSal = 0;
      const res = evaluateRoute(spec, co, ci, {
        month: opts.month ?? null, nDraws: opts.nDraws ?? 4, seed: opts.seed ?? 7, fuelPrice: this.fuelPrice, cpi: this.macro.cpi,
        demandScale: (opts.demandScale ?? 1) * trend * bias, segScale: { out: this.segScale(spec.base, spec.dest), in: this.segScale(spec.dest, spec.base) },
        offerExtra: { out: withSst(this.offerExtra(al, spec.base, spec.dest), spec.base, spec.dest, spec.type_id), in: withSst(this.offerExtra(al, spec.dest, spec.base), spec.dest, spec.base, spec.type_id) },
        costFn: (o, d, pax, fareRev) => { const c = this.costsFor(al, { ...r, base: spec.base, dest: spec.dest }, o, d, pax, fareRev, true); crewSal += (c._crewSal || 0) * spec.freq; return c; },
        rotH, dayFixed, extraDaily: slotFee + (opts.extraDaily || 0),
      });
      // Aufschlüsselung, damit die Prognose mit der Streckenliste vergleichbar ist
      const genericAc = aircraftDayFixedGeneric(spec.type_id) * res.aircraftShare;
      res.crewSalary = crewSal; res.slotFee = slotFee; res.stationDaily = opts.extraDaily || 0;
      res.know = kn ? { lv: kn.lv, sigma: kn.sigma, src: kn.src } : null;
      res.acFull = res.aircraftTimeCost - slotFee - (opts.extraDaily || 0); res.acGeneric = genericAc;
      res.db1List = res.db1 + crewSal;                 // wie in der Streckenliste: Crew nur mit Spesen
      res.db2List = res.db1List - genericAc;           // Flugzeugzeit zur Standardrate
      return res;
    }

    // Angebot
    operableFreq(al) {
      const { assign, partial } = al.plan(this.day, al.activeRoutes().filter((r) => r.opened_day <= this.day));
      const sum = {};
      for (const a of al.fleet) {
        const lst = assign[a.id] || [];
        a.used_hours = lst.reduce((s, x) => s + x[1], 0);
        a.assigned = lst.map((x) => x[0].id);
        // Flugstunden heute: bei Langstrecken-Umläufen fliegt jedes beteiligte Flugzeug nur seinen Anteil
        a.fhDay = lst.reduce((s, [r, , share]) => s + 2 * blockHours(r.base, r.dest, r.type_id) * (share ?? 1), 0);
        for (const [r, , share] of lst) sum[r.id] = (sum[r.id] || 0) + (share ?? 1);
      }
      // Umläufe je Tag: ganze Umläufe täglich, Teilbetrieb (z. B. Langstrecke mit einem Flugzeug) nur an jedem k-ten Tag
      const cnt = {}, d = this.day;
      for (const r of al.activeRoutes()) {
        r.partial = partial[r.id] || 0;
        const x = sum[r.id] || 0, whole = Math.floor(x + 1e-9), frac = x - whole;
        if (r.wk > 0 && r.wk < 7) { cnt[r.id] = x > 0 ? r.wk / 7 : 0; continue; }   // seltener als täglich: im Mittel wk/7 Flüge am Tag
        cnt[r.id] = whole + (frac > 1e-6 && Math.floor((d + 1) * frac + 1e-9) > Math.floor(d * frac + 1e-9) ? 1 : 0);
      }
      return cnt;
    }
    offerExtra(al, o, d) { return { brand: al.brandEff(this.day), extraU: al.extraU(o, d), bizPrem: al.bizPrem(), tax: this.taxAt(o, d), human: !!al.isPlayer, mat: al.maturity(this.day) }; }
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
            // Ertragssteuerung: Für erwartete Umsteiger bleibt ein Teil der Plätze reserviert (höchstens die Hälfte)
            const RL = P.ROUTE_ROLE[r.role || 'mixed'];
            const seats0 = r.seats(), resv = r.trDem && RL.protect ? Math.min(RL.protect * (r.trDem[dir] || 0), RL.protectMax * f * seats0) : 0;
            const ex = withCabin(withSst(this.offerExtra(al, o, d), o, d, r.type_id), r.type_id, r.service, r.cab);
            if (RL.localU) { const u = ex.extraU || {}; ex.extraU = { leisure: (u.leisure || 0) + RL.localU, business: (u.business || 0) + RL.localU, vfr: (u.vfr || 0) + RL.localU }; }
            const of = offer(al.id, fare, f, Math.max(1, seats0 - resv / f), r.service, otp, r.ramp(this.day, T), r.id, ex);
            if (this.coops && this.coops.length) { const cs = this.codeshareFreq(al, pairKey(o, d)); if (cs) { of.freqU = f + 0.5 * cs; of.brand = Math.min(0.95, of.brand + 0.02); } }
            get(o + '-' + d).direct.push([of, r, dir]);
          }
        }
        // Umsteigeverbindungen über eigene Drehkreuze: eine Reise, mehrere Segmente. Kunden wägen Preis gegen Reisezeit ab:
        // jeder Umweg-Kilometer und jeder Umstieg kostet Nutzen, ein Drehkreuz mit vielen Langstreckenzielen ist attraktiver.
        const TR = P.TRANSFER, canTr = (r) => r.role !== 'local';
        const hubInfo = {};
        for (const H of al.bases) {
          const spokes = al.activeRoutes().filter((r) => r.base === H && r.flyingToday > 0 && canTr(r));
          const lv = (al.hubs && al.hubs[H]) || 0, nLong = spokes.filter((r) => gcDistanceKm(r.base, r.dest) > 4000).length;
          hubInfo[H] = { spokes, lv, attr: Math.min(TR.attrMax, TR.attrPerLong * nLong), conn: Math.max(0.6, TR.connH - TR.connHPerLv * lv) };
        }
        const mkConn = (legs, hubs, a, b, pathKm, dab, svc) => {
          // legs: [[route, dir], …]; Preis: Summe der Segmenttarife mit Umsteigerabschlag
          let fare = 0, freq = Infinity, otp = 1, ramp = 1, protect = 0;
          for (const [r, dir] of legs) { fare += dir === 'out' ? r.fare_out : r.fare_in; freq = Math.min(freq, r.flyingToday); otp *= al.otp(r.buffer); ramp = Math.min(ramp, r.ramp(this.day, T)); if (r.role === 'feeder') protect++; }
          const lvMax = Math.max(...hubs.map((h) => hubInfo[h].lv)), disc = TR.discount + 0.03 * lvMax - 0.05 * (legs.length - 2);
          const of = offer(al.id, disc * fare, freq, 0, svc, otp ** 0.75, ramp, legs.map((x) => x[0].id).join('>'), this.offerExtra(al, a, b));
          if (lvMax) of.freqU = of.freq * (1 + 0.25 * lvMax);
          const pf = (1 - 0.25 * lvMax) * (protect ? 1 - TR.feederBonus * protect / legs.length : 1) * (legs.length > 2 ? TR.twoStop : 1);
          const extraH = (pathKm - dab) / TR.kmh + hubs.reduce((s2, h) => s2 + hubInfo[h].conn, 0), attr = hubs.reduce((s2, h) => s2 + hubInfo[h].attr, 0);
          of.penalty = { leisure: TR.penalty.leisure * pf, business: TR.penalty.business * pf, vfr: TR.penalty.vfr * pf };
          const u = of.extraU || {};
          of.extraU = { leisure: (u.leisure || 0) - TR.timeU.leisure * extraH + attr, business: (u.business || 0) - TR.timeU.business * extraH + attr, vfr: (u.vfr || 0) - TR.timeU.vfr * extraH + attr };
          of.conn = { legs, hubs, r1: legs[0][0], r2: legs[legs.length - 1][0], hub: hubs[0] };
          get(a + '-' + b).conn.push(of);
        };
        for (const H of al.bases) {
          const { spokes, lv } = hubInfo[H], detour = TR.max_detour + 0.1 * lv;
          for (const r1 of spokes) for (const r2 of spokes) {
            if (r1 === r2 || r1.dest === r2.dest) continue;
            const a = r1.dest, b = r2.dest, dab = gcDistanceKm(a, b);
            if (dab < TR.min_dist_km) continue;
            const path = gcDistanceKm(a, H) + gcDistanceKm(H, b);
            if (path / dab > detour) continue;
            mkConn([[r1, 'in'], [r2, 'out']], [H], a, b, path, dab, r2.service);
          }
        }
        // Drehkreuze verbinden: Zubringer → Drehkreuz 1 → Drehkreuz 2 → Ziel (zwei Umstiege, nur für weite Reisen)
        if (al.bases.length > 1) for (const H1 of al.bases) for (const H2 of al.bases) {
          if (H1 === H2) continue;
          const link = al.activeRoutes().find((r) => r.flyingToday > 0 && canTr(r) && ((r.base === H1 && r.dest === H2) || (r.base === H2 && r.dest === H1)));
          if (!link) continue;
          const dirL = link.base === H1 ? 'out' : 'in', dH = gcDistanceKm(H1, H2), detour = TR.max_detour_2 + 0.05 * Math.max(hubInfo[H1].lv, hubInfo[H2].lv);
          for (const r1 of hubInfo[H1].spokes) {
            if (r1 === link || r1.dest === H2) continue;
            const a = r1.dest, dA = gcDistanceKm(a, H1);
            for (const r2 of hubInfo[H2].spokes) {
              if (r2 === link || r2.dest === H1 || r2.dest === a) continue;
              const b = r2.dest, dab = gcDistanceKm(a, b);
              if (dab < TR.min_dist_2) continue;
              const path = dA + dH + gcDistanceKm(H2, b);
              if (path / dab > detour) continue;
              mkConn([[r1, 'in'], [link, dirL], [r2, 'out']], [H1, H2], a, b, path, dab, link.service);
            }
          }
        }
      }
      return markets;
    }

    // Ein Tag
    step() {
      setFuelX(this);
      for (const al of this.list) al._day = this.day;
      // Warteliste und geplante Strecken: frei gewordene Slots fair verteilen, Pläne umsetzen
      if (this.slotWait && this.slotWait.length) { for (const al of this.list) al.cleanHolds(this.day); this.allocateWaitlist(); }
      for (const al of this.humans) if (al.status !== 'insolvent' && al.plans && al.plans.length) this.checkPlans(al);
      for (const al of this.list) if (al.isPlayer && al.status !== 'insolvent') this.completeDaily(al);
      expireDeals(this);
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
      for (const c of connDemand) for (const [r, dir] of c.of.conn.legs) { const k = legKey(r, dir); legDem[k] = (legDem[k] || 0) + c.pax; }
      // Umsteigenachfrage je Strecke merken (gleitend) – Grundlage für die Platzreserve am nächsten Tag
      for (const al of this.list) for (const r of al.activeRoutes()) {
        if (!r.flyingToday) continue;
        const o = legDem[legKey(r, 'out')] || 0, i = legDem[legKey(r, 'in')] || 0, t = r.trDem || { out: 0, in: 0 };
        if (o || i || r.trDem) r.trDem = { out: 0.6 * t.out + 0.4 * o, in: 0.6 * t.in + 0.4 * i };
      }
      for (const c of connDemand) {
        const legs = c.of.conn.legs;
        let s = 1; for (const [r, dir] of legs) s = Math.min(s, remaining(r, dir) / legDem[legKey(r, dir)]);
        const pax = c.pax * s;
        if (pax <= 0) continue;
        const dists = legs.map(([r]) => gcDistanceKm(r.base, r.dest)), dsum = dists.reduce((a2, b2) => a2 + b2, 0);
        const rev = pax * c.of.fare + c.biz * s * c.of.fare * c.of.bizPrem;
        for (const [k, share, first] of legs.map(([r, dir], n) => [legKey(r, dir), dists[n] / dsum, n === 0])) {
          if (!transfer[k]) transfer[k] = { pax: 0, rev: 0, anc: 0, biz: 0 };
          transfer[k].pax += pax; transfer[k].rev += rev * share; transfer[k].biz += c.biz * s; if (first) transfer[k].anc += pax;
        }
      }
      for (const al of this.list) if (al.isPlayer && al.status !== 'insolvent') this.staffCoverage(al);
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        for (const r of al.activeRoutes()) {
          if (!r.flyingToday) continue;
          const st = { d: this.day, flights: 0, seats: 0, cancelled: 0, cost: 0, block_h: 0, pax: 0, rev: 0, pax_out: 0, pax_in: 0, seats_out: 0, seats_in: 0, late: 0,
            demand_out: 0, demand_in: 0, spill_out: 0, spill_in: 0, tr_out: 0, tr_in: 0, cargo: 0 };
          for (const dir of ['out', 'in']) {
            const [o, d] = dir === 'out' ? [r.base, r.dest] : [r.dest, r.base];
            const l = local[legKey(r, dir)] || { pax: 0, biz: 0, unc: 0, fare: dir === 'out' ? r.fare_out : r.fare_in };
            const t = transfer[legKey(r, dir)] || { pax: 0, rev: 0, anc: 0 };
            st['demand_' + dir] += l.unc; st['spill_' + dir] += Math.max(0, l.unc - l.pax);
            this.fly(al, r, o, d, dir, l, t, st);
          }
          st.trd = (legDem[legKey(r, 'out')] || 0) + (legDem[legKey(r, 'in')] || 0);
          const keys = al.isPlayer ? HIST_KEYS : AI_HIST_KEYS, h = {};
          for (const k of HIST_KEYS) h[k] = 0;
          for (const k of keys) h[k] = k === 'block_h' || k === 'flights' || k === 'cancelled' ? r1(st[k] || 0) : Math.round(st[k] || 0);
          r.pushHist(h);
          al.paxTotal = (al.paxTotal || 0) + (st.pax || 0);
          if (al.isPlayer) { const t = al._today || (al._today = { pax: 0, seats: 0, rev: 0, cost: 0, flights: 0, late: 0, canc: 0 }); t.pax += h.pax; t.seats += h.seats; t.rev += h.rev; t.cost += h.cost; t.flights += h.flights; t.late += h.late || 0; t.canc += h.cancelled; }
        }
      }
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        this.dailyFixed(al);
        if (al.hedge) this.settleHedge(al);
        this.liquidity(al);
        const dayG = al.isPlayer ? dayGroupsOf(al.ledger.today) : null;
        al.ledger.closeDay();
        if (al.isPlayer) {
          // Tagesreihe für das Dashboard (90 Tage)
          const t = al._today || { pax: 0, seats: 0, rev: 0, cost: 0, flights: 0, late: 0, canc: 0 }; al._today = null;
          al.dayHist = al.dayHist || []; al.dayHist.push({ d: day, net: Math.round(al.ledger.lastDay || 0), pax: t.pax, seats: t.seats, rev: Math.round(t.rev), db1: Math.round(t.rev - t.cost), fl: t.flights, late: t.late, canc: t.canc, g: dayG, cash: Math.round(al.ledger.cash / 100) });
          if (al.dayHist.length > 90) al.dayHist.shift();
          if (al.prog) this.checkCareer(al);
        }
      }
      if (dow === 6) for (const al of this.list) if (al.status !== 'insolvent') this.weeklyPricing(al);
      if (day % 30 === 15) for (const al of this.list) if (al.archetype && al.status === 'active') aiAttack(this, al);
      this.closeAuctions();
      this.fuelHist.push(this.fuelPrice); if (this.fuelHist.length > 400) this.fuelHist.shift();
      { const M = this.macro, x = M.fuelUsd / P.FUEL_USD_KG; M.fuelIdx = M.fuelIdx === undefined ? x : M.fuelIdx + (x - M.fuelIdx) / P.FUEL_PASS.ema; }
      if (MONTH_STARTS.includes((day + 1) % 365)) this.monthEnd();
      this.day += 1;
    }
    staffCoverage(al) {
      const S = P.STAFF, st = al.staff, cpi = this.macro.cpi;
      const sick = this.events.some((e) => e.type === 'sickness' && e.airline === al.id && e.start <= this.day && e.end > this.day) ? 0.88 : 1;
      // Köpfe für den heutigen Einsatz nach Blockstunden je Flugzeug, flottenweit aufgerundet
      const cn = al.crewNeed(this.day), need = { pil: cn.pil, cab: cn.cab, perAc: cn.perAc };
      const techNeed = al.fleet.filter((a) => a.delivery_day <= this.day).length * S.techPerAc;
      const cov = { pil: {}, cab: 1, tech: techNeed ? Math.min(1, st.tech / techNeed) : 1, extraCost: 0, agencyH: 0, overtimeH: 0, cancel: { ...zeroGroups(), cab: 0 }, need, techNeed };
      const cover = (capH, needH, hourly, key) => {   // hier in Köpfen; „hourly“ = Tagessatz je Kopf
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
      const daily = (sal) => sal * st.pay / 30.4;
      for (const g of STAFF_GROUPS) cov.pil[g] = cover(st.pil[g], need.pil[g], daily(S.pilotSalary[g]), g);
      cov.cab = cover(st.cab, need.cab, daily(S.cabinSalary), 'cab');
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
      // Bruchteile (Flüge seltener als täglich): ein Flug mit Gewicht wF steht im Mittel für wF Flüge am Tag
      for (let i = 0; i < Math.ceil(f - 1e-9); i++) {
        const wF = Math.min(1, f - i);
        st.flights += wF; st.seats += seats * wF;
        const rr = this.rng;
        const cancelled = rr.random() < failRate || rr.random() < weatherCancel || rr.random() < strikeCancel || rr.random() < staffCancel || (itOut && rr.random() < 0.1);
        if (cancelled) {
          st.cancelled += wF; cancelledHere += wF;
          const care = perFlight * wF * (P.CANCEL_CARE_COST_PAX * cpi + P.EU261_CLAIM_RATE * eu261(gcDistanceKm(o, d)) * (weatherCancel > 0.05 ? 0.3 : 1));
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
        for (const k of COST_KEYS.concat(['disruption'])) { L.post(k, -c[k] * wF); st.cost += c[k] * wF; }
        st.block_h += c._bh * wF;
        flown += perFlight * wF; flownLocal += perFlight * shareLocal * wF; flownTr += perFlight * (1 - shareLocal) * wF;
      }
      const locShare = l.pax > 0 ? flownLocal / l.pax : 0, trShare = t.pax > 0 ? flownTr / t.pax : 0;
      const yf = ty.yieldF || 1;
      let rev = (flownLocal * l.fare + l.biz * locShare * l.fare * al.bizPrem() + t.rev * trShare) * yf;
      if (r.cab) {
        const allF = flownLocal + flownTr, bizF = l.biz * locShare + (t.biz || 0) * trShare;
        const fareAvg = allF > 0 ? (flownLocal * l.fare + t.rev * trShare) / allF : l.fare;
        const cr = cabinRevenue(r.type_id, r.service, r.cab, f - cancelledHere, fareAvg, bizF, Math.max(0, allF - bizF), r.pm);
        if (cr.extra) rev += cr.extra * yf;
        if (cr.cost) { L.post('pax_service', -cr.cost * cpi); st.cost += cr.cost * cpi; }
        st.prem = (st.prem || 0) + cr.f + cr.b; st.ps = (st.ps || 0) + cr.seats;
      }
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
          // Checks staffeln: Ist schon ein gleiches Muster an derselben Basis in der Werft, wartet das nächste (bis 10 % Überziehung)
          const busyTwin = () => al.fleet.some((x) => x !== a && x.status === 'ccheck' && x.type_id === a.type_id && x.base === a.base);
          if (a.status === 'ok' && a.fh - a.lastC >= P.CCHECK_FH && !(a.acmi && a.acmi.start <= this.day && a.acmi.end > this.day) && !(a.fh - a.lastC < P.CCHECK_FH * 1.1 && busyTwin())) {
            const days = Math.max(4, P.CCHECK_DAYS - (al.hangars.includes(a.base) ? P.HANGAR_CHECK_DAYS : 0) - Math.round(al.skill('tech')));
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
          if (a.status === 'ok') {
            if (typeof a.fhDay === 'number') a.fh += a.fhDay;
            else for (const rid of a.assigned || []) { const r = al.routes.find((x) => x.id === rid); if (r) a.fh += 2 * blockHours(r.base, r.dest, r.type_id); }
          }
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
        L.post('overhead', -ovhAc(a.type_id) * cpi);
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
        // In der Werft (C-Check/AOG) ist ein Flugzeug nicht „ungenutzt“ – Zähler ruht
        if (a.status === 'ok') a.idle_days = a.used_hours <= 0 && !onAcmi ? a.idle_days + 1 : 0;
      }
      if (!al.isPlayer) {
        const crewFlown = -(L.today.crew || 0) / 100;
        if (crewMin > crewFlown) L.post('crew', -(crewMin - crewFlown));
        const revToday = ((L.today.rev_ticket || 0) + (L.today.rev_ancillary || 0) + (L.today.rev_cargo || 0)) / 100;
        L.post('overhead', -revToday * ({ premium: 0.10, regional: 0.05, lcc: 0.05, leisure: 0.04 }[al.archetype] || 0.05));
        const stations = new Set(al.activeRoutes().filter((r) => r.opened_day <= this.day).map((r) => r.dest));
        L.post('overhead', -P.STATION_COST_DAY_AI * stations.size * cpi);
      }
      L.post('overhead', -al.hqDay() * cpi);
      if (al.isPlayer) { let bd = 0; for (const b of al.bases) bd += baseDayCost(b); L.post('overhead', -bd * cpi); }
      else L.post('overhead', -P.BASE_FIXED_DAY * (al.bases.length - 1) * cpi);
      L.post('overhead', -P.TYPE_COMPLEXITY_DAY * Math.max(new Set(al.fleet.map((a) => P.AIRCRAFT_TYPES[a.type_id].group)).size - 1, 0) * cpi);
      let slotFee = 0;
      for (const r of al.activeRoutes()) if (r.opened_day <= this.day) for (const x of [r.base, r.dest]) slotFee += apx(x).slotFee * r.freq;
      L.post('slots', -slotFee * cpi);
      if (al.creditUsed > 0) L.post('interest', -al.creditUsed * al.creditRate(this.macro.rate, this.macro.bank ?? 1) / 365);
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
      const tick = (L.today.rev_ticket || 0) / 100, anc0 = (L.today.rev_ancillary || 0) / 100;
      if (al.mktPct > 0) L.post('marketing', -al.mktPct * (tick + anc0));
      else if (al.marketing > 0) L.post('marketing', -al.marketing / 30.4);   // ältere Stände: fester Betrag
      if (al.loyalty && al.loyalty.lv) {
        const LP = P.LOYALTY[al.loyalty.lv];
        L.post('loyalty', -(LP.fixed * cpi / 30.4 + LP.cost * tick));
        L.post('rev_ancillary', LP.partner * tick * clamp((this.day - (al.loyalty.since ?? this.day)) / 180, 0.15, 1));
      }
      let hubCost = 0; for (const [apt, lv] of Object.entries(al.hubs || {})) if (lv && al.bases.includes(apt)) hubCost += P.HUB[lv].monthly * apx(apt).cost * cpi / 30.4;
      if (hubCost) L.post('stations', -hubCost);
      let lockCost = 0; for (const apt of Object.keys(al.gateLock || {})) lockCost += al.gateLock[apt].price * P.GATE_LOCK.monthlyRate / 30.4;
      if (lockCost) L.post('stations', -lockCost);
      let holdFee = 0; for (const [apt, hs] of Object.entries(al.slotHold || {})) for (const h of hs) if (h.buy && h.until > this.day) holdFee += h.n * apx(apt).slotFee * P.SLOT_HOLD_FEE;
      if (holdFee) L.post('slots', -holdFee * cpi);
      if (al.cargo) L.post('overhead', -P.CARGO.gsaMonth * cpi / 30.4);
    }
    liquidity(al) {
      const L = al.ledger, cash = L.cash / 100, limit = al.creditLimit(this.macro.bank ?? 1);
      if (al.creditUsed > limit + 1) {
        // Die Bank kürzt die Linie: der Überhang muss zurückgezahlt werden
        const pay = Math.round(Math.min(al.creditUsed - limit, Math.max(0, cash), Math.max(50000, (al.creditUsed - limit) * 0.1)) * 100) / 100;
        if (pay > 0) { al.creditUsed -= pay; L.cashOnly(-pay, 'credit_repay'); }
        if (!al.lineCut) { al.lineCut = true; al.log(this.day, `Die Bank kürzt Ihre Kreditlinie auf ${Math.round(limit / 1e5) / 10} Mio. EUR. Der Überhang wird vom Konto eingezogen.`, 'crit'); }
      } else al.lineCut = false;
      if (cash < 0) {
        const draw = Math.round(Math.min(-cash, Math.max(0, limit - al.creditUsed)) * 100) / 100;
        if (draw > 0) { al.creditUsed += draw; L.cashOnly(draw, 'credit_draw'); }
      } else if (al.creditUsed > 0 && cash > 0) {
        const repay = Math.round(Math.min(al.creditUsed, cash * 0.5) * 100) / 100;
        al.creditUsed -= repay; L.cashOnly(-repay, 'credit_repay');
      }
      if (al.isPlayer) { al.netHist = al.netHist || []; al.netHist.push(Math.round(L.cash / 100 - al.creditUsed)); if (al.netHist.length > 400) al.netHist.shift(); }
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
        if (al.distressDays === 1) al.log(this.day, `Dispo ausgeschöpft: Das Konto steht über die Kreditlinie hinaus im Minus. Nach ${P.RESTRUCTURING_AFTER_DAYS} Tagen folgt die Restrukturierung.`, 'crit');
        if (al.distressDays === P.RESTRUCTURING_AFTER_DAYS && al.archetype && !al.rescued) {
          // Letzte Rettung für KI-Airlines: Investor oder Staatsfonds, einmalig
          const amt = Math.round((20e6 + al.fleet.length * 1.5e6) * this.macro.cpi / 1e5) * 1e5;
          L.cash += Math.round(amt * 100); L.equityContrib += Math.round(amt * 100); al.rescued = true; al.distressDays = 0;
          this.pushNews(this.day, `${al.name} wird mit ${Math.round(amt / 1e6)} Mio. EUR frischem Kapital gerettet und muss schrumpfen`, 'warn', al.id);
          this.restructure(al);
        } else if (al.distressDays === P.RESTRUCTURING_AFTER_DAYS) {
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
          if (r.base === o && r.dest === d) out.push(offer(al.id, r.fare_out, r.wk > 0 && r.wk < 7 ? r.wk / 7 : r.freq, r.seats(), r.service, al.otp(r.buffer), r.ramp(this.day, al.rampT()), r.id, withCabin(withSst(this.offerExtra(al, o, d), o, d, r.type_id), r.type_id, r.service, r.cab)));
          else if (r.dest === o && r.base === d) out.push(offer(al.id, r.fare_in, r.wk > 0 && r.wk < 7 ? r.wk / 7 : r.freq, r.seats(), r.service, al.otp(r.buffer), r.ramp(this.day, al.rampT()), r.id, withCabin(withSst(this.offerExtra(al, o, d), o, d, r.type_id), r.type_id, r.service, r.cab)));
        }
      }
      return out;
    }
    /** Preisautomatik für Spielende: einmal pro Woche kleine Schritte Richtung Ziel-Auslastung, innerhalb eines Preisbands; optional auch der Premiumaufschlag. */
    playerAutoPricing(al) {
      const A = P.PLAYER_AUTO_PRICE, moved = [];
      for (const r of al.activeRoutes()) {
        if (!(r.ap > 0) || r.hist.length < 7 || r.pending.length || this.day - r.opened_day < A.settle_days) continue;
        const cfg = apCfgOf(r), last = r.hist.slice(-7), nw = [];
        for (const [dir, fare] of [['out', r.fare_out], ['in', r.fare_in]]) {
          let seats = 0, pax = 0, spill = 0, dem = 0;
          for (const h of last) { seats += h['seats_' + dir] || 0; pax += h['pax_' + dir] || 0; spill += h['spill_' + dir] || 0; dem += h['demand_' + dir] || 0; }
          const lf = seats ? pax / seats : 0, gap = lf - r.ap;
          let step = Math.abs(gap) < A.dead ? 0 : clamp(A.gain * gap, -cfg.spd, cfg.spd);
          if (dem > 0 && spill / dem > 0.08 && lf > r.ap - A.dead) step = Math.max(step, cfg.spd * 0.7);   // viele Abweisungen: Preis rauf
          const [o, d] = dir === 'out' ? [r.base, r.dest] : [r.dest, r.base], ref = refPrice(o, d, this.macro.cpi);
          const lo = Math.max(Math.round(priceFloor(o, d, r, this) * 0.9), cfg.min ? Math.round(cfg.min * ref) : 0), hi = Math.max(lo, Math.round(cfg.max * ref));
          let nf = fare * (1 + step);
          // außerhalb des Bands: in kleinen Schritten zurück, nie springen
          if (fare > hi) nf = Math.max(hi, Math.min(nf, fare * (1 - cfg.spd)));
          else if (fare < lo) nf = Math.min(lo, Math.max(nf, fare * (1 + cfg.spd)));
          else nf = clamp(nf, lo, hi);
          nw.push(Math.round(nf));
        }
        if (cfg.plf > 0 && r.cab) {   // Premium: Aufschlag nach Premium-Auslastung
          let ps = 0, pp = 0; for (const h of last) { ps += h.ps || 0; pp += h.prem || 0; }
          if (ps > 0) {
            const gap = pp / ps - cfg.plf, pm0 = r.pm || 1;
            const st = Math.abs(gap) < A.dead ? 0 : clamp(A.gain * gap, -cfg.spd, cfg.spd);
            const pm = Math.round(clamp(pm0 * (1 + st), P.PREM_PRICE.min, P.PREM_PRICE.max) * 1000) / 1000;
            if (pm !== pm0) { if (Math.abs(pm - 1) < 0.0005) delete r.pm; else r.pm = pm; if (Math.round(nw[0]) === Math.round(r.fare_out) && Math.round(nw[1]) === Math.round(r.fare_in)) moved.push(0); }
          }
        }
        if (Math.round(nw[0]) !== Math.round(r.fare_out) || Math.round(nw[1]) !== Math.round(r.fare_in)) { moved.push((nw[0] + nw[1]) / (r.fare_out + r.fare_in) - 1); r.setFares(this.day, nw[0], nw[1]); }
      }
      if (moved.length) al.log(this.day, `Preisautomatik: ${moved.length} Strecke${moved.length > 1 ? 'n' : ''} angepasst (Ø ${moved.reduce((a, b) => a + b, 0) / moved.length >= 0 ? '+' : ''}${(moved.reduce((a, b) => a + b, 0) / moved.length * 100).toFixed(1).replace('.', ',')} %)`, 'route');
    }
    weeklyPricing(al) {
      const cfg = al.cfg, rm = al.skill('revenue');
      if (al.isPlayer) { this.playerAutoPricing(al); return; }   // Spieler: nur Strecken mit eingeschalteter Preisautomatik
      const fight = { lcc: 0.10, leisure: 0.06, regional: 0.03, premium: -0.05 }[al.archetype] ?? 0;
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
          // Gegen menschliche Airlines wird gekämpft: Preis unter den Menschen (Premium bleibt knapp darüber)
          let floorF = 1;
          const hum = this.competitorOffers(al.id, o, d).filter((x) => this.airlines[x.airline] && this.airlines[x.airline].isPlayer);
          if (hum.length) { const hf = Math.min(...hum.map((x) => x.fare)); f = Math.min(f, hf * (1 - fight * rivalsOf(this).fight)); floorF = al.ledger.cash / 100 > 20e6 ? 0.85 : 0.95; }
          nw.push(Math.min(Math.max(f, priceFloor(o, d, r, this) * floorF), 2.5 * refPrice(o, d, this.macro.cpi)));
        }
        r.setFares(this.day, nw[0], nw[1]);
      }
    }
    monthEnd() {
      const m = monthOf(this.day), y = Math.floor(this.day / 365);
      this.monthlyMacro();
      this.generateMonthlyEvents();
      if (m === 2 || m === 9) for (const c in this.slotCap) this.slotCap[c] += 1;   // Sommer- und Winterflugplan: neue Slots
      // Drehkreuze wachsen: Umsteiger erhöhen das Aufkommen am Flughafen, je 200.000 Umsteiger im Jahr kommt ein Slot dazu
      for (const al of this.humans) {
        if (al.status === 'insolvent' || !al.hubs) continue;
        for (const [H, lv] of Object.entries(al.hubs)) {
          if (!(lv > 0)) continue;
          let tr = 0, n = 0; for (const r of al.activeRoutes()) if (r.base === H) { const h = r.hist.slice(-30); tr += h.reduce((a, x) => a + (x.tr_out || 0) + (x.tr_in || 0), 0); n = Math.max(n, h.length); }
          const yearly = n ? tr / n / 2 * 365 : 0, want = Math.floor(yearly / 1e6 / P.SLOT_RULE.hubPaxPerSlot);
          al.hubSlots = al.hubSlots || {}; const had = al.hubSlots[H] || 0;
          if (want > had) { this.slotCap[H] = (this.slotCap[H] || 0) + want - had; al.hubSlots[H] = want; al.log(this.day, `Drehkreuz ${ap(H).name}: ${want - had} zusätzliche Slot${want - had > 1 ? 's' : ''} durch ${Math.round(yearly / 1000)} Tsd. Umsteiger im Jahr`, 'good'); }
        }
      }
      for (const al of this.list) {
        if (al.status === 'insolvent') continue;
        this.internalEvents(al);
        if (al.experts.length) this.expertMonth(al);
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
          const grow = al.mktPct > 0 ? (P.MKT_K2 / P.MARKETING_K) * k * (1 - Math.exp(-al.mktPct / P.MKT_SAT)) * (1 - al.brand)
            : k * Math.sqrt(Math.max(0, al.marketing) / 100000) * (1 - al.brand);
          const sst = al.activeRoutes().some((r) => P.AIRCRAFT_TYPES[r.type_id].supersonic && r.opened_day <= this.day) ? 0.015 * (1 - al.brand) : 0;   // Prestige
          al.brand = clamp(al.brand + grow + sst - P.BRAND_DECAY * al.brand * 0.5 - (otp < 0.7 ? 0.01 : 0) + (al.activeRoutes().length ? 0.004 : 0), 0.05, 0.95);
          this.playerMonthly(al);
        }
        if (al.archetype && al.status === 'active') aiMonthly(this, al);
      }
      this.refreshOffers();
      for (const al of this.list) al.cleanHolds(this.day);
      aiPoachHumans(this);
      aiStar(this);
      aiNewEntrant(this);
      aiDealOffers(this);
      this.coops = (this.coops || []).filter((c) => c.until > this.day);
      this.newAuctions();
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
        const p = P.AOG_MONTHLY * (1 + al.acAge(a, this.day) * (a.cond || 1) / 20) * (1 - lv3([0, 0.2, 0.35, 0.5], al.skill('tech'))) * mult;
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
    /** Akademien: monatliche Förderung, nach Anlaufzeit kommen eigene Absolventen (exklusiv, schwerer abzuwerben). */
    academyMonthly(al) {
      const A = al.academy; if (!A) return;
      const cpi = this.macro.cpi;
      for (const [role, x] of Object.entries(A)) {
        if (!x.lv) continue;
        const def = ACADEMY[role];
        al.ledger.post('staff_extra', -def.cost[x.lv] * cpi);
        if (this.day - x.since < def.ramp) continue;
        const n = def.out[x.lv];
        if (role === 'pilot') al.staff.pil[x.group] += n; else if (role === 'cabin') al.staff.cab += n; else al.staff.tech += n;
        al.log(this.day, `${n} Absolventinnen und Absolventen der ${def.label} beginnen bei Ihnen${role === 'pilot' ? ` (${P.TYPE_GROUPS[x.group]})` : ''}`, 'staff');
      }
    }
    /** Karriere: Aufstieg in die nächste Phase, sobald alle Bedingungen erfüllt sind. */
    checkCareer(al) {
      const c = careerChecks(this, al); if (!c || !c.ready) return false;
      al.prog.lv = c.next; al.prog.since = this.day;
      al.prog.hist = [...(al.prog.hist || []), { lv: c.next, day: this.day }];
      al.brand = clamp(al.brand + 0.01, 0.05, 0.95);
      al.log(this.day, `Neue Phase ${c.next + 1}: ${c.label}. Freigeschaltet: ${careerUnlockTxt(c.next)}`, 'good');
      if (this.humans.length > 1) this.pushNews(this.day, `${al.name} steigt auf: Phase ${c.next + 1} „${c.label}“`, 'info', al.id);
      return true;
    }
    /** Meilensteine: einmalig, mit Markenbonus und Punkten für die Rangliste. */
    checkMilestones(al) {
      const got = al.milestones || (al.milestones = {}), day = this.day;
      const ctx = milestoneCtx(this, al);
      for (const m of MILESTONES) {
        if (got[m.id] !== undefined) continue;
        let ok = false; try { ok = m.test(ctx); } catch (e) { ok = false; }
        if (!ok) continue;
        got[m.id] = day;
        al.brand = clamp(al.brand + (m.brand || 0), 0.05, 0.95);
        al.log(day, `Meilenstein erreicht: ${m.label} (+${m.pts} Punkte${m.brand ? ', Marke +' + Math.round(m.brand * 100) : ''})`, 'good');
        if (this.humans.length > 1) this.pushNews(day, `${al.name} erreicht den Meilenstein „${m.label}“`, 'info', al.id);
      }
    }
    playerMonthly(al) {
      this.academyMonthly(al);
      this.analystScan(al);
      this.checkMilestones(al);
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
        for (const g of STAFF_GROUPS) if (cov.need.pil[g] > 0 && st.pil[g] > 0) overload = Math.max(overload, cov.need.pil[g] / st.pil[g] - 1);
        if (cov.need.cab > 0 && st.cab > 0) overload = Math.max(overload, cov.need.cab / st.cab - 1);
      }
      const target = clamp(0.62 + 1.6 * (st.pay - (this.macro.wage || 1)) - 1.2 * Math.max(0, Math.min(overload, 0.3)) + lv3([0, 0.05, 0.1, 0.15], al.skill('hr')), 0.05, 0.97);
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
      this.completeStudies(al);
      for (const dcs of al.decisions) if (!dcs.resolved && dcs.deadline < this.day) { dcs.resolved = 'ignored'; al.log(this.day, 'Keine Antwort an die Gewerkschaft: Der Streik findet statt', 'warn'); }
    }
    /** Wie viele Flugzeuge eines Musters es bei allen Airlines gibt. */
    typeCount(typeId) { let n = 0; for (const al of this.list) for (const a of al.fleet) if (a.type_id === typeId) n++; return n; }
    refreshOffers() {
      const r = this.rng, day = this.day;
      this.candidates = this.candidates.filter((c) => c.expires > day);
      const roles = Object.keys(P.EXPERT_ROLES).filter((k) => !P.EXPERT_ROLES[k].unique);
      while (this.candidates.length < 8) {
        const role = r.pick(roles), level = r.random() < 0.45 ? 1 : r.random() < 0.7 ? 2 : 3;
        const years = level === 1 ? r.int(2, 6) : level === 2 ? r.int(7, 14) : r.int(15, 28);
        const salary = Math.round(P.EXPERT_ROLES[role].salary[level - 1] * r.range(0.9, 1.15) * this.macro.cpi / 100) * 100;
        this.candidates.push({ id: 'C' + (++this.offerCounter), name: `${r.pick(FIRST)} ${r.pick(LAST)}`, role, level, years, region: r.pick(Object.keys(P.REGIONS)), salary,
          trait: r.pick(TRAITS), prev: r.pick(PREV), expires: day + r.int(25, 50) });
      }
      this.ensureStar();
      this.acMarket = this.acMarket.filter((o) => o.expires > day);
      while (this.acMarket.length < 12) {
        const pool = Object.keys(P.AIRCRAFT_TYPES).filter((k) => { const tt = P.AIRCRAFT_TYPES[k]; return !tt.launch && (!tt.worldMax || this.typeCount(k) + this.acMarket.filter((o) => o.type === k).length < tt.worldMax); });
        let typeId = pool[0]; { let tw = 0; for (const k of pool) tw += P.AIRCRAFT_TYPES[k].marketWeight ?? 1; let x = r.random() * tw; for (const k of pool) { x -= P.AIRCRAFT_TYPES[k].marketWeight ?? 1; if (x <= 0) { typeId = k; break; } } }
        const t = P.AIRCRAFT_TYPES[typeId];
        const age = t.age >= 10 ? r.int(t.age - 3, t.age + 7) : r.random() < 0.3 ? r.int(0, 2) : r.int(3, 16);
        const rel = Math.max(0, age - t.age);
        // Verborgener Zustand: 1 = normal, < 1 gepflegt, > 1 verbraucht. Nur ein Gutachter sieht ihn genau; der Preis verrät wenig.
        const cond = age < 3 ? r.range(0.9, 1.05) : r.random() < 0.25 ? r.range(1.3, 1.65) : r.random() < 0.3 ? r.range(0.65, 0.85) : r.range(0.88, 1.15);
        const pf = 1 - 0.05 * (cond - 1);
        this.acMarket.push({ id: 'A' + (++this.offerCounter), type: typeId, age, cond: Math.round(cond * 100) / 100, lease_month: Math.round(t.lease_month * (1 - P.AGE.lease * rel) * pf * r.range(0.93, 1.08) * this.macro.cpi / 1000) * 1000,
          price: Math.round(t.value_eur * Math.max(0.25, 1 - P.AGE.value * rel) * pf * r.range(0.92, 1.06) / 1e5) * 1e5, delivery: r.int(10, 40), fhSinceC: r.int(0, P.CCHECK_FH - 500),
          expires: day + r.int(20, 60), kind: t.supersonic ? 'buy' : r.random() < 0.65 ? 'lease' : 'buy' });
      }
      this.acmiOffers = this.acmiOffers.filter((o) => o.expires > day);
      while (this.acmiOffers.length < 4) {
        const typeId = r.pick(['AT76', 'DH8D', 'E295', 'BCS3', 'A20N', 'A20N', 'B38M', 'A21N', 'A339', 'B789', 'A359']), t = P.AIRCRAFT_TYPES[typeId];
        const start = day + r.int(10, 35), dur = r.pick([14, 21, 30, 45, 60, 90]);
        const client = r.pick(['Reiseveranstalter SunTours', 'Netzwerkcarrier mit Flugzeugmangel', 'Sportverband für Mannschaftsflüge', 'Kreuzfahrtreederei', 'Ferienairline in der Hochsaison', 'Regierungsdelegation']);
        this.acmiOffers.push({ id: 'W' + (++this.offerCounter), client, type: typeId, start, end: start + dur, rate: Math.round(t.acmi_day * r.range(0.9, 1.2) * this.macro.cpi / 100) * 100, expires: start - 3 });
      }
    }

    // Auktionen: frühe Lieferpositionen für neue Muster und knappe Typen (verdeckte Gebote, Höchstbietende gewinnen)
    newAuctions() {
      const r = this.rng, day = this.day;
      this.auctions = (this.auctions || []).filter((x) => !x.done || x.closes > day - 120);
      const lot = (type, n, delivery, minBid, note) => {
        const a = { id: 'L' + (++this.offerCounter), type, n, closes: day + 12, delivery, minBid: Math.round(minBid / 50000) * 50000, bids: {}, done: false, note };
        // KI bietet verdeckt mit
        for (const al of this.list) {
          if (!al.archetype || al.status !== 'active' || al.fleet.length >= al.maxFleet) continue;
          const t = P.AIRCRAFT_TYPES[type], fits = (al.cfg.pref_types || []).some((x) => P.AIRCRAFT_TYPES[x].group === t.group) || (t.ill.kind === 'wide' && al.archetype === 'premium');
          if (fits && al.ledger.cash / 100 > 30e6 && r.random() < 0.6) a.bids[al.id] = Math.round(a.minBid * r.range(1.0, 1.9) / 10000) * 10000;
        }
        this.auctions.push(a);
        this.pushNews(day, `Auktion: ${n} frühe Lieferpositionen für ${t2(type)} – Gebote bis ${12} Tage, Auslieferung ${delivery} Tage nach Zuschlag. ${note || ''}`, 'info', null);
      };
      const t2 = (x) => P.AIRCRAFT_TYPES[x].label;
      for (const [id, t] of Object.entries(P.AIRCRAFT_TYPES)) {
        if (!t.launch || day < t.launch - 30 || day > t.launch + 365) continue;
        lot(id, r.int(2, 3), Math.max(30, t.launch - day + 30), t.value_eur * r.range(0.02, 0.04), 'Neues Muster – im ersten Jahr nur über Auktion.');
      }
      const busy = Object.entries(this.lessorQueue || {}).filter(([k, q]) => q >= 6 && P.AIRCRAFT_TYPES[k] && !P.AIRCRAFT_TYPES[k].launch).sort((a, b) => b[1] - a[1])[0];
      if (busy && r.random() < 0.7) lot(busy[0], r.int(1, 3), 10, P.AIRCRAFT_TYPES[busy[0]].value_eur * r.range(0.006, 0.012), 'Lange Wartezeiten beim Leasinggeber – wer bietet, fliegt früher.');
    }
    closeAuctions() {
      for (const a of this.auctions || []) {
        if (a.done || a.closes > this.day) continue;
        a.done = true; a.winners = [];
        const bids = Object.entries(a.bids).sort((x, y) => y[1] - x[1]);
        for (const [alId, amt] of bids) {
          if (a.winners.length >= a.n) break;
          const al = this.airlines[alId]; if (!al || al.status === 'insolvent') continue;
          const t = P.AIRCRAFT_TYPES[a.type], deposit = P.LEASE_DEPOSIT_MONTHS * t.lease_month * (1 + acTariff(this, al, a.type));
          if (al.spendable(this.macro.bank ?? 1) < amt + deposit) { if (al.isPlayer) al.log(this.day, `Auktion ${t.label}: Zuschlag verfallen – zu wenig Geld für Gebot und Kaution.`, 'warn'); continue; }
          al.ledger.post('one_off', -amt);
          const ac = al.acquire(this.day, a.type, al.bases[0], 'lease', { delivery: a.delivery, lease_month: t.lease_month, age: 0, auction: true }, this);
          careerNoteAcq(this, al);
          a.winners.push(alId);
          if (al.isPlayer) al.log(this.day, `Auktion gewonnen: ${t.label} für ${Math.round(amt / 1000)} Tsd. EUR Prämie, Auslieferung am Tag ${ac.delivery_day + 1}.`, 'good');
        }
        const cut = a.winners.length ? a.bids[a.winners[a.winners.length - 1]] : null;
        for (const [alId, amt] of bids) { const al = this.airlines[alId]; if (al && al.isPlayer && !a.winners.includes(alId)) al.log(this.day, `Auktion ${P.AIRCRAFT_TYPES[a.type].label} verloren: Ihr Gebot ${Math.round(amt / 1000)} Tsd. EUR, Zuschlag ab ${Math.round((cut || 0) / 1000)} Tsd. EUR.`, 'warn'); }
        a.cut = cut;
        if (a.winners.length) this.pushNews(this.day, `Auktion ${P.AIRCRAFT_TYPES[a.type].label}: Zuschlag an ${a.winners.map((x) => this.airlines[x].name).join(', ')}`, 'info', null);
      }
    }
    bid(al, lotId, amount) {
      const a = (this.auctions || []).find((x) => x.id === lotId && !x.done);
      if (!a) return { ok: false, msg: 'Die Auktion ist beendet.' };
      amount = Math.round(amount / 10000) * 10000;
      if (amount < a.minBid) return { ok: false, msg: `Mindestgebot ${Math.round(a.minBid / 1000)} Tsd. EUR.` };
      if (a.bids[al.id] && amount < a.bids[al.id]) return { ok: false, msg: 'Gebote lassen sich nur erhöhen.' };
      if (al.spendable(this.macro.bank ?? 1) < amount) return { ok: false, msg: 'Dafür reicht auch der Dispo nicht.' };
      a.bids[al.id] = amount;
      al.log(this.day, `Gebot ${Math.round(amount / 1000)} Tsd. EUR für ${P.AIRCRAFT_TYPES[a.type].label} abgegeben`, 'info');
      return { ok: true };
    }
    /** Personal bei einer anderen Airline abwerben: Erfolg hängt von Gehaltsabstand, Prämie und Stimmung drüben ab. */
    poach(al, tid, role, group, n, bonus) {
      const T = this.airlines[tid], S = P.STAFF, r = this.rng, day = this.day;
      if (!T || T === al || T.status === 'insolvent') return { ok: false, msg: 'Ungültige Airline.' };
      if (!['pilot', 'cabin', 'tech'].includes(role) || (role === 'pilot' && !STAFF_GROUPS.includes(group))) return { ok: false, msg: 'Ungültige Gruppe.' };
      n = clamp(Math.round(n), 1, 20); bonus = clamp(Math.round(bonus), 0, 60000);
      al.poachLog = al.poachLog || {};
      if (al.poachLog[tid] !== undefined && day - al.poachLog[tid] < 30) return { ok: false, msg: `Bei ${T.name} können Sie erst in ${30 - (day - al.poachLog[tid])} Tagen wieder werben.` };
      const have = T.isPlayer ? (role === 'pilot' ? T.staff.pil[group] : role === 'cabin' ? T.staff.cab : T.staff.tech) : (role !== 'pilot' || T.fleet.some((a) => P.AIRCRAFT_TYPES[a.type_id].group === group) ? n * 3 : 0);
      if (have <= 0) return { ok: false, msg: `${T.name} hat keine ${roleLabel(role, group)}.` };
      const sal = (role === 'pilot' ? S.pilotSalary[group] : role === 'cabin' ? S.cabinSalary : S.techSalary) * (this.macro.wage || 1) * this.macro.cpi;
      const theirPay = T.staff ? T.staff.pay : 1 + ({ premium: 0.06, lcc: -0.04 }[T.archetype] || 0), theirMorale = T.staff ? T.staff.morale : 0.62;
      const acLv = T.academy && T.academy[role] ? T.academy[role].lv || 0 : 0;
      const p = clamp((0.12 + 0.9 * (al.staff.pay - theirPay) + 0.35 * Math.min(1, bonus / (sal * 3)) + 0.8 * Math.max(0, 0.65 - theirMorale)) * (1 - 0.12 * acLv), 0.03, 0.85);
      let taken = 0; for (let i = 0; i < Math.min(n, have); i++) if (r.random() < p) taken++;
      const cost = taken * bonus + n * S.recruit[role] * 0.4 * this.macro.cpi;
      al.ledger.post('staff_extra', -cost);
      al.poachLog[tid] = day;
      if (taken) {
        if (T.isPlayer) {
          if (role === 'pilot') T.staff.pil[group] -= taken; else if (role === 'cabin') T.staff.cab -= taken; else T.staff.tech -= taken;
          T.staff.morale = clamp(T.staff.morale - 0.02, 0, 1);
          T.log(day, `${al.name} hat ${taken} ${roleLabel(role, group)} abgeworben.`, 'crit');
        }
        al.staff.pipeline.push({ kind: 'hire', role, group: role === 'pilot' ? group : null, count: taken, ready: day + 7, month: -1 });
        T.grudge = T.grudge || {}; T.grudge[al.id] = (T.grudge[al.id] || 0) + taken;
        this.pushNews(day, `${al.name} wirbt ${taken} ${roleLabel(role, group)} bei ${T.name} ab`, 'ai', al.id);
      } else if (T.isPlayer) T.log(day, `${al.name} hat versucht, Ihr Personal abzuwerben – ohne Erfolg.`, 'warn');
      al.log(day, `Abwerbeversuch bei ${T.name}: ${taken} von ${n} ${roleLabel(role, group)} wechseln (Start in 7 Tagen), Kosten ${Math.round(cost / 1000)} Tsd. EUR`, taken ? 'staff' : 'warn');
      return { ok: true, taken, tried: n, cost, p };
    }
    poachExpert(al, tid, eid, factor) {
      const T = this.airlines[tid], r = this.rng, day = this.day;
      if (!T || !T.isPlayer || T === al) return { ok: false, msg: 'Fachkräfte lassen sich nur bei Mitspielenden abwerben.' };
      const e = T.experts.find((x) => x.id === eid); if (!e) return { ok: false, msg: 'Die Person arbeitet dort nicht mehr.' };
      if (al.experts.filter((x) => x.role === e.role).length >= P.EXPERT_ROLES[e.role].max) return { ok: false, msg: `${P.EXPERT_ROLES[e.role].label} ist bei Ihnen schon besetzt.` };
      al.poachLog = al.poachLog || {};
      const key = 'x' + tid;
      if (al.poachLog[key] !== undefined && day - al.poachLog[key] < 30) return { ok: false, msg: 'Erst in einigen Tagen wieder möglich.' };
      factor = clamp(Number(factor) || 1.2, 1.05, 1.8);
      const p = clamp((0.1 + (factor - 1) * 1.1 + Math.max(0, 0.6 - T.staff.morale) * 0.6 - (e.level - 1) * 0.05) * this.poachShield(e, day), 0.03, 0.85);
      al.poachLog[key] = day;
      al.ledger.post('experts', -e.salary * 0.5);   // Headhunter
      if (r.random() < p) {
        const C = P.EXPERT_CONTRACT, nca = !!e.nca, comp = nca ? Math.round(e.salary * C.ncaComp) : 0;
        T.experts = T.experts.filter((x) => x !== e);
        const ne = expertJoin(this, { ...e, salary: Math.round(e.salary * (nca ? 1 / (1 + C.ncaSalary) : 1) * factor / 100) * 100, refs: [...(e.refs || []), ...(e.ps != null ? [{ airline: T.name, perf: Math.round(e.ps * 100) / 100, months: e.psN || 0 }] : [])].slice(-3) }, day);
        if (nca) { ne.startDay = day + C.ncaWait; al.ledger.post('experts', -comp); T.ledger.post('experts', comp); }
        al.experts.push(ne);
        T.log(day, `${e.name} (${P.EXPERT_ROLES[e.role].label}) wechselt zu ${al.name}.${nca ? ` Wettbewerbsverbot: ${al.name} zahlt Ihnen ${Math.round(comp / 1000)} Tsd. EUR Ablöse, ${e.he ? 'er' : 'sie'} darf erst in ${C.ncaWait} Tagen anfangen.` : ''}`, 'crit');
        al.log(day, `${e.name} kommt von ${T.name} zu Ihnen (${Math.round((factor - 1) * 100)} % mehr Gehalt)${nca ? ` – wegen Wettbewerbsverbot ${Math.round(comp / 1000)} Tsd. EUR Ablöse, Start in ${C.ncaWait} Tagen` : ''}.`, 'good');
        this.pushNews(day, `${al.name} wirbt ${e.name} bei ${T.name} ab`, 'ai', al.id);
        return { ok: true, taken: 1, p, nca: !!e.nca };
      }
      e.salary = Math.round(e.salary * 1.05 / 100) * 100;
      T.log(day, `${al.name} wollte ${e.name} abwerben. ${e.he ? 'Er' : 'Sie'} bleibt – für 5 % mehr ${e.he ? 'Honorar' : 'Gehalt'}.`, 'warn');
      return { ok: true, taken: 0, p };
    }

    // Spieleraktionen
    hire(al, role, group, count, start = null) {
      const S = P.STAFF, st = al.staff;
      const tight = role === 'pilot' ? this.macro.laborTight : 1 + (this.macro.laborTight - 1) * 0.4;
      const lead = hireLead(this, al, role);
      if (!(count > 0)) return { ok: false, msg: 'Bitte eine Anzahl angeben.' };
      const month = Math.floor(this.day / 30);
      const inPipe = st.pipeline.filter((p) => p.kind === 'hire' && p.role === role && p.month === month).reduce((s, p) => s + p.count, 0);
      const maxN = Math.floor(S.maxHire[role] / tight);
      if (inPipe + count > maxN) return { ok: false, msg: `Der Arbeitsmarkt gibt diesen Monat nur noch ${Math.max(0, maxN - inPipe)} ${roleLabel(role, group)} her.` };
      // Gemeinsamer Arbeitsmarkt: Was andere Airlines diesen Monat eingestellt haben, fehlt allen
      if (!this.labor || this.labor.m !== month) this.labor = { m: month, pilot: 0, cabin: 0, tech: 0, aiAc: (this.labor && this.labor.aiAc) || 0 };
      const { pool, used } = laborPool(this, role);
      if (used + count > pool) return { ok: false, msg: `Der Arbeitsmarkt ist leergefegt: Diesen Monat gibt es nur noch ${Math.max(0, pool - used)} ${roleLabel(role, group)} – andere Airlines haben schon eingestellt.` };
      this.labor[role] = used + count;
      const cost = S.recruit[role] * count * this.macro.cpi * tight * (this.macro.wage || 1) * (1 + 0.6 * used / Math.max(1, pool));
      al.ledger.post('staff_extra', -cost);
      // Antritt zum Termin (z. B. Lieferung eines Flugzeugs): früher als die Vorlaufzeit geht nicht, Gehalt erst ab Antritt
      const ready = start > this.day + lead ? Math.min(Math.round(start), this.day + 180) : this.day + lead, sched = ready > this.day + lead;
      st.pipeline.push(sched ? { kind: 'hire', role, group, count, ready, month, sched: true } : { kind: 'hire', role, group, count, ready, month });
      al.log(this.day, `${count} ${roleLabel(role, group)} eingestellt, Start ${sched ? `zum Termin am Tag ${ready + 1}` : `in ${lead} Tagen`}`, 'staff');
      return { ok: true, lead: ready - this.day, cost, ready, sched };
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
    /** Tim Kaminski: steht zur Verfügung, solange ihn niemand unter Vertrag hat. */
    starHolder(id = P.STAR_CONSULTANT.id) { return this.list.find((a) => a.experts.some((e) => e.id === id)) || null; }
    ensureStar() {
      for (const S of P.STAR_CONSULTANTS) {
        if (this.starHolder(S.id) || this.candidates.some((c) => c.id === S.id)) continue;
        const sal = P.EXPERT_ROLES[S.role].salary[S.level - 1];
        this.candidates.push({ ...S, salary: Math.round(sal * (this.macro.cpi || 1) / 1000) * 1000, expires: 1e9, since: this.day });
      }
    }
    /** Freigestellte Fachkraft sucht neu – mit Referenz (Bewertung beim bisherigen Arbeitgeber). */
    expertToMarket(e, al) {
      if (this.candidates.some((c) => c.id === e.id)) return;
      const refs = [...(e.refs || []), ...(e.ps !== null && e.ps !== undefined ? [{ airline: al.name, perf: Math.round(e.ps * 100) / 100, months: e.psN || 0 }] : [])].slice(-3);
      const { pm, ps, psN, perf, hiredDay, bindUntil, nca, startDay, raise, ...rest } = e;
      const sal = P.EXPERT_ROLES[e.role].salary[e.level - 1] * this.macro.cpi * this.rng.range(0.92, 1.08);
      this.candidates.push({ ...rest, refs, salary: Math.round(sal / 100) * 100, expires: this.day + this.rng.int(30, 60) });
    }
    /** Monatlich: Leistung der Fachkräfte schwankt, gelegentlich ein Fehlgriff oder Glücksgriff; Bewertung als gleitender Schnitt. */
    expertMonth(al) {
      const E = P.EXPERT_PERF, r = this.rng, day = this.day;
      for (const e of al.experts) {
        if (e.perf === undefined) { e.talent = expertTalent(e); e.perf = clamp(e.talent, E.min, E.max); e.pm = e.perf; e.ps = null; e.psN = 0; }
        if (e.startDay && e.startDay > day) continue;
        const uniq = P.EXPERT_ROLES[e.role].unique, x = r.random();
        let pm = clamp(e.perf + r.gauss(0, E.noiseSd), E.min, E.max), note = null;
        if (!uniq && x < E.mistakeP) { pm = e.perf * E.mistake; note = 'miss'; }
        else if (!uniq && x < E.mistakeP + E.luckyP) { pm = Math.min(E.max + 0.1, e.perf * E.lucky); note = 'luck'; }
        const ramp = Math.min(1, 0.6 + 0.4 * Math.max(0, day - (e.hiredDay ?? day)) / E.rampDays), shown = pm * ramp;
        e.pm = Math.round(pm * 1000) / 1000;
        e.ps = e.ps === null || e.ps === undefined ? shown : 0.65 * e.ps + 0.35 * shown; e.ps = Math.round(e.ps * 1000) / 1000; e.psN = (e.psN || 0) + 1;
        if (al.isPlayer && note) al.log(day, note === 'miss' ? `${e.name} (${P.EXPERT_ROLES[e.role].label}): ${EXPERT_MISS[e.role] || 'Fehleinschätzung'} – diesen Monat nur ${Math.round(pm * 100)} % der zugesagten Wirkung` : `${e.name} (${P.EXPERT_ROLES[e.role].label}): ${EXPERT_LUCK[e.role] || 'starker Monat'} – ${Math.round(pm * 100)} % der zugesagten Wirkung`, note === 'miss' ? 'warn' : 'good');
      }
    }
    /** Vertrag einer Fachkraft: Halteprämie, Wettbewerbsverbot, Gehaltserhöhung. */
    expertContract(al, id, kind, v) {
      const C = P.EXPERT_CONTRACT, e = al.experts.find((x) => x.id === id), day = this.day;
      if (!e) return { ok: false, msg: 'Die Person arbeitet nicht (mehr) bei Ihnen.' };
      if (P.EXPERT_ROLES[e.role].unique) return { ok: false, msg: 'Mit Beratermandaten gibt es keine Zusatzverträge.' };
      if (kind === 'bind') {
        if (e.bindUntil > day) return { ok: false, msg: `Die Bindung läuft schon bis ${e.bindUntil}.` };
        const cost = Math.round(e.salary * C.bindCost);
        if (al.spendable(this.macro.bank ?? 1) < cost) return { ok: false, msg: 'Dafür reicht die Liquidität nicht.' };
        al.ledger.post('experts', -cost); e.bindUntil = day + C.bindDays;
        al.log(day, `${e.name}: Halteprämie ${Math.round(cost / 1000)} Tsd. EUR, gebunden für zwölf Monate (Kündigungsschutz)`, 'staff');
        return { ok: true, cost };
      }
      if (kind === 'nca') {
        const on = !!v; if (!!e.nca === on) return { ok: true };
        e.salary = Math.round(e.salary * (on ? 1 + C.ncaSalary : 1 / (1 + C.ncaSalary)) / 100) * 100;
        if (on) e.nca = true; else delete e.nca;
        al.log(day, on ? `${e.name}: Wettbewerbsverbot vereinbart (+${Math.round(C.ncaSalary * 100)} % Gehalt als Karenzausgleich)` : `${e.name}: Wettbewerbsverbot aufgehoben`, 'staff');
        return { ok: true };
      }
      if (kind === 'raise') {
        const pctv = clamp(Number(v) || 0, 0.05, 0.2), mkt = P.EXPERT_ROLES[e.role].salary[e.level - 1] * this.macro.cpi * (e.nca ? 1 + C.ncaSalary : 1);
        if (e.salary * (1 + pctv) > mkt * (1 + C.raiseMax) * 1.001 + 100) return { ok: false, msg: 'Mehr als 30 % über Markt zahlt sich nicht mehr aus.' };
        e.salary = Math.round(e.salary * (1 + pctv) / 100) * 100;
        al.log(day, `${e.name}: Gehalt nachverhandelt, +${Math.round(pctv * 100)} %`, 'staff');
        return { ok: true };
      }
      return { ok: false, msg: 'Unbekannte Vertragsart.' };
    }
    /** Faktor auf die Abwerbechance: Bindung, Wettbewerbsverbot, Gehalt im Vergleich zum Markt, Betriebszugehörigkeit. */
    poachShield(e, day) {
      const C = P.EXPERT_CONTRACT, mkt = P.EXPERT_ROLES[e.role].salary[e.level - 1] * this.macro.cpi * (e.nca ? 1 + C.ncaSalary : 1);
      const payF = clamp(1 - 2 * (e.salary / Math.max(1, mkt) - 1), 0.4, 1.3), tenure = clamp(1 - 0.08 * Math.max(0, day - (e.hiredDay ?? day)) / 365, 0.75, 1);
      return (e.bindUntil > day ? C.bindP : 1) * (e.nca ? C.ncaP : 1) * payF * tenure;
    }
    hireExpert(al, cid) {
      const c = this.candidates.find((x) => x.id === cid);
      if (!c) return { ok: false, msg: 'Die Person ist nicht mehr verfügbar.' };
      if (al.experts.filter((e) => e.role === c.role).length >= P.EXPERT_ROLES[c.role].max) return { ok: false, msg: `${P.EXPERT_ROLES[c.role].label} ist schon besetzt. Erst die bisherige Person freistellen.` };
      const sign = P.EXPERT_ROLES[c.role].signOn || 0;
      if (sign && al.ledger.cash / 100 + al.creditLimit(this.macro.bank ?? 1) - al.creditUsed < sign + c.salary) return { ok: false, msg: `${c.name} verlangt ${Math.round(sign / 1000)} Tsd. € Antrittshonorar plus das erste Monatshonorar im Voraus. Dafür reicht die Liquidität nicht.` };
      if (sign) { al.ledger.post('experts', -sign); this.pushNews(this.day, `${al.name} holt ${c.name} als Berater`, 'ai', al.id); }
      al.experts.push(expertJoin(this, { ...c }, this.day));
      al.ledger.post('experts', -c.salary);
      this.candidates = this.candidates.filter((x) => x !== c);
      al.log(this.day, `${c.name} beginnt in ${P.EXPERT_ROLES[c.role].label} (${['', 'Junior', 'Senior', 'Expertin/Experte'][c.level]})`, 'staff');
      return { ok: true };
    }
    fireExpert(al, id) {
      const e = al.experts.find((x) => x.id === id); if (!e) return { ok: false, msg: 'Die Person arbeitet nicht (mehr) bei Ihnen.' };
      const unique = P.EXPERT_ROLES[e.role].unique;
      al.ledger.post('experts', -e.salary * (unique ? 1 : 3));
      al.experts = al.experts.filter((x) => x !== e);
      al.log(this.day, unique ? `Mandat mit ${e.name} beendet, ein Monatshonorar Auslauf` : `${e.name} freigestellt, Abfindung drei Monatsgehälter`, 'staff');
      if (!unique) this.expertToMarket(e, al);
      if (unique) { this.ensureStar(); this.pushNews(this.day, `${e.name} ist wieder zu haben`, 'info', null); }
      return { ok: true };
    }
    commissionStudy(al, a, b) {
      const lv = al.skillNom('analyst'), eff = Math.max(0.3, al.skill('analyst'));
      if (!lv) return { ok: false, msg: 'Für Marktstudien brauchen Sie eine Person in der Marktanalyse.' };
      const k = pairKey(a, b);
      if (al.studies[k] && !al.studies[k].done) return { ok: false, msg: 'Diese Studie läuft bereits.' };
      const an = al.experts.filter((e) => e.role === 'analyst' || P.EXPERT_ROLES[e.role].unique).sort((x, y) => y.level - x.level)[0];
      const regional = P.REGIONS[an.region] && (P.REGIONS[an.region].includes(a) || P.REGIONS[an.region].includes(b));
      const li = Math.min(lv, 3) - 1, top = lv > 3 ? 0.6 : 1;
      const days = Math.round(P.STUDY_DAYS[li] * top * (regional ? 0.6 : 1)), err = P.STUDY_ERR[li] * top * (regional ? 0.6 : 1) * clamp(lv / eff, 0.7, 2.5);
      al.studies[k] = { ready: this.day + days, est: this.trendOf(a, b) * Math.exp(this.rng.gauss(0, err)), err, done: false, by: an.name, day: this.day };
      al.ledger.post('one_off', -P.STUDY_COST * this.macro.cpi);
      al.log(this.day, `Marktstudie ${k} beauftragt (${an.name}, fertig in ${days} Tagen)`, 'info');
      return { ok: true, days };
    }
    knownTrend(al, a, b) { const s = al.studies[pairKey(a, b)]; return s && s.done ? s.est : 1; }
    /** Marktwissen einer Airline über eine Verbindung (Stufe, Unsicherheit, Stand). */
    knowOf(al, a, b) {
      const MI = P.MARKET_INFO, k = pairKey(a, b), day = this.day;
      if (!al.isPlayer) return { lv: 9, sigma: 0, day: 0, src: 'ai' };
      if (al.activeRoutes().some((r) => pairKey(r.base, r.dest) === k)) return { lv: 5, sigma: MI.own, day: 0, src: 'own' };
      let lv = 0, d0 = 0, src = 'none';
      { const served = (x) => al.bases.includes(x) || al.activeRoutes().some((r) => r.base === x || r.dest === x); if (served(a) && served(b)) { lv = 1; src = 'station'; } }
      const rec = al.mk && al.mk[k];
      if (rec) { const e = rec.lv - Math.floor((day - rec.day) / MI.decay); if (e > lv) { lv = e; d0 = rec.day; src = rec.src || 'study'; } }
      const s = al.studies[k];
      if (s && s.done) { const e = (s.err <= 0.03 ? 4 : s.err <= 0.06 ? 3 : 2) - Math.floor((day - s.ready) / MI.decay); if (e > lv) { lv = e; d0 = s.ready; src = 'pair'; } }
      lv = clamp(lv, 0, 4);
      return { lv, sigma: MI.sigma[lv] * (1 - lv3(MI.analyst, al.skill('analyst'))), day: d0, src };
    }
    /** Fester Schätzfehler je Airline, Verbindung und Wissensstand – neu würfeln lässt er sich nicht, nur durch besseres Wissen verkleinern. */
    knowBias(al, a, b, k) {
      if (!k || !(k.sigma > 0) || k.lv >= 9) return 1;
      const g = new Rng(hashStr(`${this.seed}|${al.id}|${pairKey(a, b)}|${Math.min(k.lv, 4)}|${k.day || 0}`));
      return Math.exp(k.sigma * clamp(g.gauss(0, 1), -2, 2));
    }
    /** Reisepotenzial, wie die Airline es kennt (beide Richtungen, Jahresmittel oder Monat m). */
    knownPot(al, a, b, m = null) {
      const k = this.knowOf(al, a, b), f = this.knowBias(al, a, b, k) * this.knownTrend(al, a, b);
      const x = qPot(a, b, m), y = qPot(b, a, m), sum = (x.leisure + x.business + x.vfr + y.leisure + y.business + y.vfr) * f;
      return { sum, leisure: (x.leisure + y.leisure) * f, business: (x.business + y.business) * f, vfr: (x.vfr + y.vfr) * f, lo: sum * Math.exp(-1.3 * k.sigma), hi: sum * Math.exp(1.3 * k.sigma), lv: k.lv, sigma: k.sigma, src: k.src };
    }
    markKnow(al, a, b, lv, src = 'study') {
      if (!al.isPlayer) return;
      const k = pairKey(a, b), cur = this.knowOf(al, a, b);
      if (cur.lv >= lv && cur.src !== 'station') return;
      al.mk = al.mk || {}; al.mk[k] = { lv, day: this.day, src };
      const keys = Object.keys(al.mk);
      if (keys.length > P.MARKET_INFO.max) { keys.sort((x, y) => al.mk[x].day - al.mk[y].day); for (const x of keys.slice(0, keys.length - P.MARKET_INFO.max)) delete al.mk[x]; }
    }
    /** Fachkraft Marktanalyse: bewertet jeden Monat die größten noch kaum bekannten Märkte ab Ihren Basen. */
    analystScan(al) {
      const lv = Math.round(Math.min(3, al.skill('analyst'))), n = P.MARKET_INFO.scan[lv] || 0; if (!n) return;
      const cand = [];
      for (const b of al.bases) for (const d of AP_CODES) { if (d === b || !routeKmOk(b, d)) continue; const k = this.knowOf(al, b, d); if (k.lv >= 2) continue; cand.push([b, d, potSum(b, d)]); }
      cand.sort((x, y) => y[2] - x[2]);
      const pick = cand.slice(0, n);
      for (const [b, d] of pick) this.markKnow(al, b, d, 2, 'analyst');
      if (pick.length) al.log(this.day, `Marktanalyse: ${pick.length} Verbindungen neu bewertet (${pick.slice(0, 4).map(([b, d]) => `${b}–${d}`).join(', ')}${pick.length > 4 ? ' …' : ''}) – die Streckenplanung rechnet dort jetzt genauer`, 'info');
    }

    // ------------------------------------------------------------------------
    // Marktstudien (Beratungsaufträge): Bericht entsteht nach Ablauf aus den echten Spieldaten
    // ------------------------------------------------------------------------
    studyPrice(al, tier) {
      const T = P.STUDIES.tiers[tier], lv = al.skillNom('analyst');
      return { cost: Math.round(T.cost * this.macro.cpi * (1 - 0.1 * Math.min(lv, 3)) / 1000) * 1000, days: Math.max(2, Math.round(T.days * (1 - 0.15 * Math.min(lv, 3)))) };
    }
    orderStudy(al, kind, tier, focus) {
      const S = P.STUDIES;
      if (!S.kinds[kind] || !S.tiers[tier]) return { ok: false, msg: 'Unbekannte Studie.' };
      const f = studyFocus(focus);
      if (f === false) return { ok: false, msg: 'Ungültiger Schwerpunkt.' };
      al.reports = al.reports || [];
      if (al.reports.filter((r) => r.status === 'running').length >= S.maxRunning) return { ok: false, msg: `Höchstens ${S.maxRunning} Studien gleichzeitig.` };
      const { cost, days } = this.studyPrice(al, tier);
      if (al.spendable(this.macro.bank ?? 1) < cost) return { ok: false, msg: `Für die Studie (${Math.round(cost / 1000)} Tsd. EUR) reicht auch der Dispo nicht.` };
      al.ledger.post('one_off', -cost);
      const id = 'S' + (++this.offerCounter);
      al.reports.push({ id, kind, tier, focus: f, day: this.day, ready: this.day + days, status: 'running', cost });
      al.log(this.day, `${S.tiers[tier].label} „${S.kinds[kind].label}“${f ? ' mit Schwerpunkt ' + focusLabel(f) : ''} beauftragt – Bericht in ${days} Tagen`, 'info');
      return { ok: true, id, days, cost };
    }
    completeStudies(al) {
      if (!al.reports || !al.reports.length) return;
      for (const rep of al.reports) {
        if (rep.status !== 'running' || rep.ready > this.day + 1) continue;   // läuft zu Beginn des Tages: fertig, sobald der Liefertag erreicht ist
        try { rep.res = runStudy(this, al, rep); rep.status = 'done'; }
        catch (e) { rep.status = 'done'; rep.res = { title: 'Bericht unvollständig', summary: 'Die Beratung konnte die Analyse nicht abschließen. Die Kosten werden erstattet.', rows: [], risks: [], notes: [] }; al.ledger.post('one_off', rep.cost || 0); }
        al.log(this.day, `Marktstudie fertig: ${P.STUDIES.kinds[rep.kind].label} (${P.STUDIES.tiers[rep.tier].label}) – Bericht unter Markt → Marktstudien`, 'good');
      }
      const S = P.STUDIES; if (al.reports.length > S.keep) { const keep = al.reports.filter((r) => r.status === 'running'); const done = al.reports.filter((r) => r.status !== 'running').slice(-(S.keep - keep.length)); al.reports = done.concat(keep); }
    }
    forecastBand(al) { return lv3([0.25, 0.18, 0.12, 0.08], al.skill('analyst')); }
    /**
     * Kerosin-Absicherung als Swap auf eine feste Menge: Bei Abschluss wird die Menge je Tag festgeschrieben (Anteil × heutiger Bedarf).
     * Täglich wird abgerechnet: Tagespreis über dem Festpreis = Ausgleich an Sie, darunter = Sie zahlen. Wer später wächst, hat nicht mehr
     * abgesichert; vorzeitiges Beenden kostet den Marktwert der Restlaufzeit (keine Gratis-Option mehr).
     */
    settleHedge(al) {
      const h = al.hedge; if (!h) return;
      if (h.until <= this.day) { al.log(this.day, `Kerosin-Absicherung ausgelaufen, Ergebnis ${h.pnl >= 0 ? '+' : '−'}${Math.round(Math.abs(h.pnl || 0) / 1000)} Tsd. EUR`, 'info'); al.hedge = null; return; }
      if (!(h.kgDay > 0)) h.kgDay = (h.share || 0) * this.estFuelKgMonth(al) / 30.4;
      const v = (this.fuelPrice - h.price) * h.kgDay;
      al.ledger.post('hedge', v); h.pnl = Math.round(((h.pnl || 0) + v) * 100) / 100;
    }
    closeHedge(al, why = 'vorzeitig beendet') {
      const h = al.hedge; if (!h || h.until <= this.day) { al.hedge = null; return 0; }
      if (!(h.kgDay > 0)) h.kgDay = (h.share || 0) * this.estFuelKgMonth(al) / 30.4;
      const rem = h.until - this.day, fwd = this.fuelPrice * (1 + P.FUEL_HEDGE.contango * rem / 91);
      const mtm = (fwd - h.price) * h.kgDay * rem, fee = 0.005 * h.price * h.kgDay * rem;
      al.ledger.post('hedge', mtm - fee);
      al.log(this.day, `Kerosin-Absicherung ${why}: Restlaufzeit ${rem} Tage zum Terminpreis abgerechnet, ${mtm - fee >= 0 ? 'Gutschrift' : 'Kosten'} ${Math.round(Math.abs(mtm - fee) / 1000)} Tsd. EUR`, mtm - fee >= 0 ? 'info' : 'warn');
      al.hedge = null;
      return mtm - fee;
    }
    setHedge(al, share, months) {
      const H = P.FUEL_HEDGE, prem = H.premium - lv3([0, 0.005, 0.01, 0.015], al.skill('procurement'));
      share = clamp(share, 0, H.maxShare);
      if (share <= 0) { const v = this.closeHedge(al); return { ok: true, closeout: v }; }
      if (al.hedge && al.hedge.until > this.day) this.closeHedge(al, 'ersetzt');
      const vol = share * this.estFuelKgMonth(al) * months;
      const impact = (this.macro.fuelPressure || 0) + vol / 4e8;
      const price = this.fuelPrice * (1 + H.contango * months / 3) * (1 + impact);
      const cost = share * this.estFuelKgMonth(al) * this.fuelPrice * prem * months;
      this.macro.fuelPressure = (this.macro.fuelPressure || 0) + vol / 2e8;
      if (vol > 4e6) this.pushNews(this.day, `Großeinkauf am Kerosinmarkt: ${al.name} sichert ${Math.round(vol / 1000)} t ab – die Terminpreise ziehen an`, 'info', al.id);
      al.ledger.post('hedge', -cost);
      al.hedge = { share, kgDay: Math.round(share * this.estFuelKgMonth(al) / 30.4), price, until: this.day + Math.round(months * 30.4), months, cost, from: this.day, pnl: 0 };
      al.log(this.day, `Kerosin abgesichert: ${Math.round(share * 100)} % für ${months} Monate zu ${price.toFixed(3).replace('.', ',')} EUR/kg, Prämie ${Math.round(cost / 1000)} Tsd. EUR`, 'info');
      return { ok: true, cost, price };
    }
    hedgeQuote(al, share, months) {
      const H = P.FUEL_HEDGE, prem = H.premium - lv3([0, 0.005, 0.01, 0.015], al.skill('procurement'));
      const vol = clamp(share, 0, H.maxShare) * this.estFuelKgMonth(al) * months, impact = (this.macro.fuelPressure || 0) + vol / 4e8;
      return { price: this.fuelPrice * (1 + H.contango * months / 3) * (1 + impact), cost: clamp(share, 0, H.maxShare) * this.estFuelKgMonth(al) * this.fuelPrice * prem * months, prem, impact };
    }
    estFuelKgMonth(al) {
      let kg = 0;
      for (const r of al.activeRoutes()) { const t = P.AIRCRAFT_TYPES[r.type_id], bh = blockHours(r.base, r.dest, r.type_id); kg += 2 * r.freq * (t.fuel_cycle_kg + t.fuel_bh_kg * bh); }
      return kg * 30.4;
    }
    loanRate(al) { return this.macro.rate + al.ratingInfo().spread + 0.01 + (1 - (this.macro.bank ?? 1)) * 0.03 - lv3([0, 0.005, 0.01, 0.015], al.skill('finance')); }
    loanLimit(al) {
      if (al.rating === 'CCC') return 0;
      const f = { A: 0.9, BBB: 0.6, BB: 0.35, B: 0.15 }[al.rating] || 0.15;
      const track = al.ledger.months.length >= 6 ? 1 : al.ledger.months.length >= 3 ? 0.6 : 0.25;
      return Math.max(0, f * track * (this.macro.bank ?? 1) * balanceSheet(al).equity - al.loans.reduce((s, l) => s + l.balance, 0));
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
      const ln = al.loans.find((x) => x.id === id); if (!ln) return { ok: false, msg: 'Diesen Kredit gibt es nicht (mehr).' };
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
      { const L = careerOf(al), lv = careerLv(al);
        if (L && al.bases.length >= L.bases) { const nx = CAREER.levels.findIndex((x) => x.bases > al.bases.length); return { ok: false, msg: `In Phase ${lv + 1} „${L.label}“ sind ${L.bases === 1 ? 'eine Basis' : L.bases + ' Basen'} möglich. Mehr ab Phase ${nx + 1} „${CAREER.levels[nx].label}“ (${needTxt(CAREER.levels[nx].need)}).` }; }
        if (L && (ap(apt).pax || 0) > L.basePax) { const nx = CAREER.levels.findIndex((x) => x.basePax >= (ap(apt).pax || 0)); return { ok: false, msg: `Basen an Flughäfen über ${L.basePax} Mio. Passagiere gibt es ab Phase ${nx + 1} „${CAREER.levels[nx].label}“.` }; } }
      const lic = al.stations[apt] ? 0 : licenceFee(this, apt);
      const setup = baseSetupCost(this, apt);
      if (al.spendable(this.macro.bank ?? 1) < setup + lic) return { ok: false, msg: `Für die Basis (${Math.round((setup + lic) / 1000)} Tsd. EUR${lic ? ' inkl. Lizenz' : ''}) reicht auch der Dispo nicht.` };
      al.bases.push(apt); al.station(apt);
      this.newEntrantSlots(apt);
      al.ledger.post('one_off', -setup - lic);
      al.log(this.day, `Basis ${ap(apt).name}: Einrichtung ${Math.round(setup / 1000)} Tsd. EUR${lic ? `, Betriebslizenz ${Math.round(lic / 1000)} Tsd. EUR` : ''}, laufend rund ${Math.round(baseDayCost(apt) * 30.4 / 1000)} Tsd. EUR im Monat`, 'route');
      al.log(this.day, `Neue Basis ${ap(apt).name} eröffnet`, 'route');
      return { ok: true };
    }
    // ---------- Strategie: Kabinen, Kundenbindung, Drehkreuze, Slots ----------
    setCabin(al, haul, f, b) {
      if (!P.CABIN[haul]) return { ok: false, msg: 'Unbekannte Streckenart.' };
      const C = P.CABIN[haul];
      f = haul === 'long' ? clamp(Math.round((Number(f) || 0) * 100) / 100, 0, C.maxF) : 0;
      b = clamp(Math.round((Number(b) || 0) * 100) / 100, 0, C.maxB);
      if (f + b > 1) return { ok: false, msg: 'First und Business zusammen dürfen höchstens 100 % der Kabine belegen.' };
      const cur = cabClone(al.cabin) || { short: { f: 0, b: 0 }, long: { f: 0, b: 0 } }, was = cur[haul];
      const delta = Math.abs(was.f - f) + Math.abs(was.b - b);
      if (delta < 0.005) return { ok: true, msg: 'Keine Änderung.' };
      const n = al.fleet.filter((a) => haulOf(a.type_id) === haul && a.delivery_day <= this.day).length;
      const cost = n * P.CABIN.refit[haul] * Math.min(1, delta / 0.3) * this.macro.cpi;
      if (cost > 0 && al.spendable(this.macro.bank ?? 1) < cost) return { ok: false, msg: `Der Umbau von ${n} Flugzeugen kostet ${Math.round(cost / 1000)} Tsd. EUR – dafür reicht auch der Dispo nicht.` };
      cur[haul] = { f, b }; al.cabin = cur;
      if (cost > 0) al.ledger.post('one_off', -cost);
      for (const r of al.routes) if (!r.closed) r.cab = cabClone(cur);
      al.log(this.day, `Kabinen ${haul === 'long' ? 'Langstrecke' : 'Kurz- und Mittelstrecke'}: ${Math.round(f * 100)} % First, ${Math.round(b * 100)} % Business, ${Math.round((1 - f - b) * 100)} % Economy${cost ? ` (Umbau ${n} Flugzeuge: ${Math.round(cost / 1000)} Tsd. EUR)` : ''}`, 'fleet');
      this.operableFreq(al);
      return { ok: true, cost };
    }
    setLoyalty(al, lv) {
      lv = clamp(Math.round(Number(lv) || 0), 0, P.LOYALTY.length - 1);
      const cur = (al.loyalty && al.loyalty.lv) || 0; if (lv === cur) return { ok: true };
      const cost = lv > cur ? (P.LOYALTY[lv].setup - (cur ? P.LOYALTY[cur].setup : 0)) * this.macro.cpi : 0;
      if (cost > 0 && al.spendable(this.macro.bank ?? 1) < cost) return { ok: false, msg: `Die Einführung kostet ${Math.round(cost / 1000)} Tsd. EUR – dafür reicht auch der Dispo nicht.` };
      if (cost > 0) al.ledger.post('one_off', -cost);
      al.loyalty = lv ? { lv, since: cur ? al.loyalty.since : this.day } : null;
      al.log(this.day, lv ? `Kundenbindung: ${P.LOYALTY[lv].label} ${cur ? 'eingeführt (Wechsel)' : 'gestartet'}${cost ? ` – Einführung ${Math.round(cost / 1000)} Tsd. EUR` : ''}` : 'Vielfliegerprogramm eingestellt – die Mitglieder wandern ab', 'info');
      return { ok: true, cost };
    }
    setHub(al, apt, lv) {
      if (!al.bases.includes(apt)) return { ok: false, msg: 'Drehkreuze gibt es nur an eigenen Basen.' };
      lv = clamp(Math.round(Number(lv) || 0), 0, P.HUB.length - 1);
      al.hubs = al.hubs || {}; const cur = al.hubs[apt] || 0; if (lv === cur) return { ok: true };
      { const L = careerOf(al); if (L && lv > cur && lv > L.hub) { const nx = CAREER.levels.findIndex((x) => x.hub >= lv); return { ok: false, msg: `${P.HUB[lv].label} gibt es ab Phase ${nx + 1} „${CAREER.levels[nx].label}“ (${needTxt(CAREER.levels[nx].need)}).` }; } }
      const spokes = al.activeRoutes().filter((r) => r.base === apt).length;
      if (lv > cur && spokes < P.HUB[lv].minRoutes) return { ok: false, msg: `${P.HUB[lv].label} braucht mindestens ${P.HUB[lv].minRoutes} Strecken ab ${apt} (bisher ${spokes}).` };
      const cost = lv > cur ? (P.HUB[lv].setup - (cur ? P.HUB[cur].setup : 0)) * apx(apt).cost * this.macro.cpi : 0;
      if (cost > 0 && al.spendable(this.macro.bank ?? 1) < cost) return { ok: false, msg: `Der Ausbau kostet ${Math.round(cost / 1000)} Tsd. EUR – dafür reicht auch der Dispo nicht.` };
      if (cost > 0) al.ledger.post('one_off', -cost);
      if (lv) al.hubs[apt] = lv; else delete al.hubs[apt];
      al.log(this.day, `${ap(apt).name}: ${lv ? P.HUB[lv].label : 'kein Drehkreuz mehr'}${cost ? ` (Ausbau ${Math.round(cost / 1000)} Tsd. EUR)` : ''}`, 'route');
      if (lv > cur && w_isMulti(this)) this.pushNews(this.day, `${al.name} baut ${ap(apt).name} zum ${P.HUB[lv].label} aus`, 'ai', al.id);
      return { ok: true, cost };
    }
    slotPrice(apt) { return slotValue(this, apt); }
    /** Kaufpreis für n freie Slots: je knapper der Rest, desto teurer (der letzte freie Slot kostet das Vierfache). */
    slotBuyPrice(apt, n) {
      const F = this.slotsFree(apt), base = this.slotPrice(apt); let sum = 0;
      for (let j = 0; j < n; j++) sum += base * (1 + 3 * j / Math.max(1, F - 1));
      return sum;
    }
    buySlots(al, apt, n) {
      if (!P.AIRPORTS[apt] || apx(apt).slots === null) return { ok: false, msg: 'Slots gibt es nur an koordinierten Flughäfen.' };
      const free = Math.max(0, this.slotsFree(apt) - this.waitBlock(apt, al)); n = n === 'all' ? free : Math.round(Number(n) || 0);
      if (!(n > 0)) return { ok: false, msg: free > 0 ? 'Bitte eine Anzahl angeben.' : `In ${apt} ist kein Slot mehr frei${this.waitBlock(apt, al) ? ' (die frei werdenden gehen an die Warteliste)' : ''}. Tragen Sie sich auf die Warteliste ein.` };
      if (n > free) return { ok: false, msg: `In ${apt} sind nur noch ${free} Slots frei.` };
      const price = this.slotBuyPrice(apt, n);
      if (al.spendable(this.macro.bank ?? 1) < price) return { ok: false, msg: `${n} Slots kosten ${Math.round(price / 1000)} Tsd. EUR – dafür reicht auch der Dispo nicht.` };
      al.slotInvest(apt, price, n);
      (al.slotHold[apt] = al.slotHold[apt] || []).push({ n, until: 1e9, buy: true });
      al.log(this.day, `${n} Slot${n === 1 ? '' : 's'} in ${ap(apt).name} gekauft (${Math.round(price / 1000)} Tsd. EUR)${this.slotsFree(apt) <= 0 ? ' – der Flughafen ist jetzt voll, ohne Sie kommt dort niemand mehr dazu' : ''}`, 'route');
      if (w_isMulti(this) || this.slotsFree(apt) <= 0) this.pushNews(this.day, `${al.name} kauft ${n} Slots in ${ap(apt).name}${this.slotsFree(apt) <= 0 ? ' – keine freien Slots mehr' : ''}`, 'ai', al.id);
      return { ok: true, n, price };
    }
    sellSlots(al, apt, n) {
      const have = (al.slotHold[apt] || []).filter((h) => h.buy && h.until > this.day).reduce((s, h) => s + h.n, 0);
      n = n === 'all' ? have : Math.min(have, Math.round(Number(n) || 0));
      if (!(n > 0)) return { ok: false, msg: 'Keine gekauften, ungenutzten Slots dort.' };
      let left = n; for (const h of al.slotHold[apt]) { if (!h.buy) continue; const k = Math.min(h.n, left); h.n -= k; left -= k; if (!left) break; }
      al.cleanHolds(this.day);
      const back = this.slotPrice(apt) * n * 0.5, book = al.slotDivest(apt, n);
      al.ledger.post('one_off', back - book, false); al.ledger.cashOnly(back, 'slots_sale');
      al.log(this.day, `${n} Slots in ${ap(apt).name} zurückgegeben (Erlös ${Math.round(back / 1000)} Tsd. EUR)`, 'route');
      return { ok: true, n, back };
    }
    gateLockPrice(apt) { return Math.max(1, ap(apt).pax || 1) * P.GATE_LOCK.perMioPax * this.macro.cpi; }
    setGateLock(al, apt, on) {
      if (!P.AIRPORTS[apt]) return { ok: false, msg: 'Ungültig.' };
      al.gateLock = al.gateLock || {};
      if (!on) { if (!al.gateLock[apt]) return { ok: true }; delete al.gateLock[apt]; al.log(this.day, `Exklusivvertrag in ${ap(apt).name} gekündigt`, 'route'); return { ok: true }; }
      if (al.gateLock[apt]) return { ok: true };
      if (!al.bases.includes(apt) && !al.activeRoutes().some((r) => r.base === apt || r.dest === apt)) return { ok: false, msg: 'Ein Exklusivvertrag geht nur an Flughäfen, die Sie anfliegen.' };
      const o = this.lockOwner(apt); if (o) return { ok: false, msg: `${o.name} hat dort schon alle Gates.` };
      const price = this.gateLockPrice(apt);
      if (al.spendable(this.macro.bank ?? 1) < price) return { ok: false, msg: `Der Vertrag kostet ${Math.round(price / 1000)} Tsd. EUR – dafür reicht auch der Dispo nicht.` };
      al.ledger.post('one_off', -price);
      al.gateLock[apt] = { since: this.day, price };
      al.log(this.day, `Exklusivvertrag in ${ap(apt).name}: alle freien Gates gehören Ihnen. Andere Airlines können dort keine neuen Flüge mehr anbieten.`, 'route');
      this.pushNews(this.day, `${al.name} sichert sich alle Gates in ${ap(apt).name}`, 'ai', al.id);
      return { ok: true, price };
    }
    /** Basis schließen: Strecken ab dort werden eingestellt (nur mit force), Flugzeuge ziehen an eine andere Basis um. */
    closeBase(al, apt, to, force) {
      if (!al.bases.includes(apt)) return { ok: false, msg: 'Dort ist keine Basis.' };
      if (al.bases.length <= 1) return { ok: false, msg: 'Die letzte Basis kann nicht geschlossen werden.' };
      const routes = al.activeRoutes().filter((r) => r.base === apt);
      if (routes.length && !force) return { ok: false, msg: `Ab ${apt} laufen noch ${routes.map((r) => r.base + '–' + r.dest).join(', ')}.`, routes: routes.map((r) => r.id) };
      const rest = al.bases.filter((b) => b !== apt), target = rest.includes(to) ? to : rest[0];
      for (const r of routes) al.closeRoute(this.day, r, `Basis ${apt} geschlossen`);
      let moved = 0;
      for (const a of al.fleet) if (a.base === apt) { a.base = target; a.pins = []; if (a.mode === 'manual') a.mode = 'auto'; moved++; }
      al.bases = rest; al.hangars = al.hangars.filter((x) => x !== apt);
      const cpi = this.macro.cpi, cost = P.BASE_SETUP_COST * 0.25 * cpi + moved * 12000 * cpi;
      al.ledger.post('one_off', -cost);
      al.log(this.day, `Basis ${ap(apt).name} geschlossen${routes.length ? `, ${routes.length} Strecken eingestellt` : ''}${moved ? `, ${moved} Flugzeuge nach ${target} verlegt` : ''} (${Math.round(cost / 1000)} Tsd. EUR)`, 'route');
      this.operableFreq(al);
      return { ok: true, cost, moved, target, closed: routes.length };
    }
    moveAircraft(al, acId, base) {
      const a = al.fleet.find((x) => x.id === acId); if (!a || !al.bases.includes(base)) return { ok: false };
      a.base = base; al.ledger.post('one_off', -12000 * this.macro.cpi);
      if (a.pins && a.pins.length) { a.pins = []; if (a.mode === 'manual') a.mode = 'auto'; }
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
    w.takeSlots(al, spec.base, spec.dest, spec.freq);
    al.openRoute(w.day + P.LEASE_DELIVERY_DAYS, spec.base, spec.dest, spec.type_id, spec.freq, spec.fare_out, spec.fare_in, spec.service, spec.buffer, al.cfg.target_lf, true, false);
    w.pushNews(w.day, `${al.name} kündigt ${ap(spec.base).name}–${ap(spec.dest).name} an: ${spec.freq}x täglich, ab ${Math.round(Math.min(spec.fare_out, spec.fare_in))} EUR${why ? ' · ' + why : ''}`, 'ai', al.id);
  }
  function aiSpec(w, al, base, dest, typeId, freq) {
    const cfg = al.cfg, cpi = w.macro.cpi;
    const co = w.competitorOffers(al.id, base, dest), ci = w.competitorOffers(al.id, dest, base);
    return { co, ci, spec: { airline: al.id, base, dest, type_id: typeId, freq, fare_out: aiRulePrice(base, dest, cfg, co.map((c) => c.fare), cpi),
      fare_in: aiRulePrice(dest, base, cfg, ci.map((c) => c.fare), cpi), service: cfg.service, buffer: cfg.buffer, cab: cabClone(al.cabinCfg()) } };
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
      if (w.slotsFree(nb) < 2 || w.lockedFor(al, nb)) continue;
      const cands = [];
      for (const dest of aiCandidates(al, nb, new Set(), 8)) {
        if (!rangeOk(nb, dest, typeId) || served.has(pairKey(nb, dest)) || !w.slotsOkFor(al, nb, dest, 1) || barred(w, al.id, nb, dest)) continue;
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
      if (!al.spareCapacity(w.day, spec.type_id, nb, rotationHours(spec.base, spec.dest, spec.type_id, spec.service, spec.buffer)) && !al.acquire(w.day, spec.type_id, nb, 'lease', null, w)) continue;
      aiOpen(w, al, spec, 'neue Basis');
    }
    return true;
  }
  function potSum(o, d) { const q = qBase(o, d); return (q.leisure + q.business + q.vfr) * accessibility(o, d); }

  // ===========================================================================
  // Marktstudien: Auswertung aus den Spieldaten (Prognosemodell wie in der Streckenplanung)
  // ===========================================================================
  /** Schwerpunkt prüfen: null (weltweit), { t: 'region' | 'country' | 'apt', v } – false bei ungültig. */
  function studyFocus(f) {
    if (!f || !f.t) return null;
    if (f.t === 'region' && REGION_ORDER.includes(f.v)) return { t: 'region', v: f.v };
    if (f.t === 'country' && COUNTRY_DATA[f.v]) return { t: 'country', v: f.v };
    if (f.t === 'country' && COUNTRY_DATA[f.v]) return { t: 'country', v: f.v };
    if (f.t === 'apt' && P.AIRPORTS[f.v]) return { t: 'apt', v: f.v };
    return false;
  }
  const focusLabel = (f) => (!f ? 'weltweit' : f.t === 'region' ? f.v : f.t === 'country' ? COUNTRY_DATA[f.v].nom : `${ap(f.v).name} (${f.v})`);
  const inFocus = (f, c) => !f || (f.t === 'region' ? ap(c).region === f.v : f.t === 'country' ? ap(c).country === f.v : c === f.v);
  /** Sinnvolle Muster für eine Entfernung: eigene Flotte zuerst, dann Standardtypen der Klasse. */
  function studyTypes(w, al, o, d, extra = []) {
    const km = gcDistanceKm(o, d) * P.ROUTE_DETOUR;
    const std = km < 900 ? ['AT76', 'E295', 'A20N'] : km < 2500 ? ['E295', 'A20N', 'A21N'] : km < 6300 ? ['A20N', 'A21N', 'A21X'] : km < 9000 ? ['A339', 'B789', 'A21X'] : ['B789', 'A359', 'B77W'];
    const own = [...new Set(al.fleet.map((a) => a.type_id))];
    const ok = (t) => { const T = P.AIRCRAFT_TYPES[t]; return T && !T.supersonic && rangeOk(o, d, t) && !(T.launch && w.day < T.launch + 365) && (T.stock !== 0); };
    return [...new Set([...own, ...extra, ...std])].filter(ok).slice(0, 4);
  }
  /** Beste Kombination aus Muster und Tarif (1× täglich) für eine Strecke. */
  /** Wissensstand, mit dem eine Studie rechnet (und den sie danach hinterlässt). */
  function studyKnow(w, al, o, d, T) {
    const cur = w.knowOf(al, o, d); if (!T.klv || cur.lv >= T.klv) return cur;
    const MI = P.MARKET_INFO; return { lv: T.klv, sigma: MI.sigma[T.klv] * (1 - lv3(MI.analyst, al.skill('analyst'))), day: w.day, src: 'study' };
  }
  function studyEval(w, al, o, d, T, types = null) {
    const tys = types || studyTypes(w, al, o, d);
    const know = studyKnow(w, al, o, d, T);
    if (T.klv) w.markKnow(al, o, d, T.klv, 'study');
    let best = null;
    for (const t of tys) for (const k of T.fares) {
      const fare = Math.round(refPrice(o, d, w.macro.cpi) * k);
      const x = w.forecastFor(al, { airline: al.id, base: o, dest: d, type_id: t, freq: 1, fare_out: fare, fare_in: fare, service: 'standard', buffer: 'normal' }, { nDraws: T.draws, seed: 11, know });
      if (!best || x.db2 > best.db2) best = { o, d, type: t, fare, km: Math.round(gcDistanceKm(o, d)), pax: x.pax, lf: x.lf, rev: x.revenue, db1: x.db1, db2: x.db2, cost: x.revenue - x.db2, bh: blockHours(o, d, t) * 2, acShare: x.aircraftShare };
    }
    return best;
  }
  function compOf(w, al, o, d) {
    const co = w.competitorOffers(al.id, o, d), names = {};
    for (const x of co) names[x.airline] = (names[x.airline] || 0) + x.freq;
    return { n: Object.keys(names).length, freq: co.reduce((s, x) => s + x.freq, 0), fare: co.length ? co.reduce((s, x) => s + x.fare * x.freq, 0) / Math.max(1, co.reduce((s, x) => s + x.freq, 0)) : null, top: Object.entries(names).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, f]) => [w.airlines[id] ? w.airlines[id].name : id, f]) };
  }
  function routeRisks(w, al, x, comp) {
    const out = [];
    if (comp.n) out.push(`${comp.n} Konkurrent${comp.n > 1 ? 'en' : ''} mit zusammen ${comp.freq} Flügen täglich${comp.fare ? `, Ø Tarif ${Math.round(comp.fare)} EUR` : ''}`);
    const rail = railShare(x.o, x.d); if (rail > 0.05) out.push(`Bahn nimmt rund ${Math.round(rail * 100)} % der Reisenden`);
    if (!w.slotsOkFor(al, x.o, x.d, 1)) out.push('Slots an einem Ende derzeit knapp');
    if (x.lf < 0.6) out.push(`Auslastung nur ${Math.round(x.lf * 100)} % – kleineres Muster oder Preis prüfen`);
    if (x.acShare > 0.9) out.push('Bindet ein Flugzeug fast vollständig');
    return out;
  }
  const r0 = (x) => Math.round(x);
  function runStudy(w, al, rep) {
    const T = { ...P.STUDIES.tiers[rep.tier], klv: P.MARKET_INFO.studyLv[rep.tier] || 2 }, f = rep.focus, band = P.MARKET_INFO.sigma[P.MARKET_INFO.studyLv[rep.tier] || 2] * (1 - lv3(P.MARKET_INFO.analyst, al.skill('analyst')));
    const served = new Set(al.activeRoutes().map((r) => pairKey(r.base, r.dest)));
    const assumptions = [`Prognose wie in der Streckenplanung: Nachfrage, Wettbewerb und Kosten von heute, ohne Reaktion der Konkurrenz. Unsicherheit etwa ±${Math.round(band * 100)} %${T.trend ? '' : ', unbekannte Nachfragetrends nicht gemessen'}.`,
      `Tarife: ${T.fares.map((k) => Math.round(k * 100) + ' %').join(' / ')} des Referenzpreises getestet, 1 Flug täglich, Standardprodukt.`];
    const res = { focus: focusLabel(f), rows: [], risks: [], notes: [], assumptions };
    if (rep.kind === 'routes') {
      const bases = f && f.t === 'apt' && al.bases.includes(f.v) ? [f.v] : al.bases;
      const cand = [];
      for (const b of bases) for (const d of AP_CODES) {
        if (d === b || !routeKmOk(b, d) || served.has(pairKey(b, d))) continue;
        if (f && !(f.t === 'apt' && al.bases.includes(f.v)) && !inFocus(f, d)) continue;
        if (!studyTypes(w, al, b, d).length) continue;
        cand.push([b, d, potSum(b, d)]);
      }
      cand.sort((a, b) => b[2] - a[2]);
      const ev = cand.slice(0, T.cand).map(([o, d]) => studyEval(w, al, o, d, T)).filter(Boolean).sort((a, b) => b.db2 - a.db2);
      res.examined = Math.min(cand.length, T.cand); res.pool = cand.length;
      for (const x of ev.slice(0, T.top)) { const comp = compOf(w, al, x.o, x.d), nAc = Math.max(1, Math.ceil(x.acShare - 0.05));
        res.rows.push({ ...x, pax: r0(x.pax), rev: r0(x.rev), db1: r0(x.db1), db2: r0(x.db2), cost: r0(x.cost), comp, risks: routeRisks(w, al, x, comp), nAc, invest: r0(acquireCost(al, x.type, 'lease', null, w.macro.eurusd, w) * nAc), leaseMonth: r0(P.AIRCRAFT_TYPES[x.type].lease_month * P.EURUSD / w.macro.eurusd * nAc) }); }
      const good = res.rows.filter((x) => x.db2 > 0);
      res.title = `${good.length} von ${res.rows.length} vorgeschlagenen Strecken tragen sich`;
      res.summary = `Untersucht: ${res.examined} der ${res.pool} freien Verbindungen ab ${bases.join(', ')}${f ? ` mit Schwerpunkt ${focusLabel(f)}` : ''} – vorausgewählt nach Reisepotenzial, dann mit der Prognose durchgerechnet.`;
      if (good.length) { const b = good[0]; res.rec = { text: `${b.o}–${b.d} mit ${P.AIRCRAFT_TYPES[b.type].label}, 1× täglich zu ${b.fare} EUR: rund ${r0(b.db2)} EUR Streckenbeitrag (DB2) pro Tag bei ${Math.round(b.lf * 100)} % Auslastung.`, why: b.comp.n ? `Stärkster Beitrag trotz ${b.comp.n} Konkurrent${b.comp.n > 1 ? 'en' : ''}.` : 'Stärkster Beitrag, derzeit ohne Direktkonkurrenz.', act: { t: 'route', o: b.o, d: b.d, type: b.type, fare: b.fare } }; }
      else res.rec = { text: 'Keine der untersuchten Verbindungen trägt sich zu diesen Tarifen mit einem Flug täglich.', why: 'Kleinere Muster, andere Basen oder ein anderer Schwerpunkt könnten helfen – eine Basisanalyse zeigt, wo das Netz stärker wäre.' };
      res.growth = good.length >= 3 ? 'hoch' : good.length ? 'mittel' : 'gering';
      if (T.trend) for (const x of res.rows.slice(0, 3)) { const k = pairKey(x.o, x.d); if (!(al.studies[k] && al.studies[k].done)) { al.studies[k] = { ready: w.day, est: w.trendOf(x.o, x.d) * Math.exp(w.rng.gauss(0, 0.04)), err: 0.04, done: true, by: 'Marktanalyse', day: w.day }; } }
      if (T.trend) res.notes.push('Für die drei besten Vorschläge wurde zusätzlich der Nachfragetrend gemessen – die Streckenplanung rechnet ab jetzt damit.');
    } else if (rep.kind === 'fleet') {
      // Strecken: eigene (mit heutigem Tarif) plus die besten freien Kandidaten
      const own = al.activeRoutes().slice().sort((a, b) => routeDb(b, 30, al) - routeDb(a, 30, al)).slice(0, T.top + 4).map((r) => ({ o: r.base, d: r.dest, fare: r.fare_out, cur: r.type_id, own: true }));
      const cand = [];
      for (const b of al.bases) for (const d of AP_CODES) { if (d !== b && routeKmOk(b, d) && !served.has(pairKey(b, d)) && inFocus(f, d)) cand.push([b, d, potSum(b, d)]); }
      cand.sort((a, b) => b[2] - a[2]);
      const pairs = own.concat(cand.slice(0, Math.max(4, Math.round(T.cand / 8))).map(([o, d]) => ({ o, d, fare: Math.round(refPrice(o, d, w.macro.cpi)), own: false })));
      const types = Object.keys(P.AIRCRAFT_TYPES).filter((t) => { const X = P.AIRCRAFT_TYPES[t]; return !(X.launch && w.day < X.launch + 365) && (X.stock !== 0 || al.fleet.some((a) => a.type_id === t)); });
      const tab = [];
      for (const t of types) {
        let sum = 0, n = 0, best = null;
        for (const p of pairs) {
          if (!rangeOk(p.o, p.d, t)) continue;
          if (!p.own && !p.know) { p.know = studyKnow(w, al, p.o, p.d, T); w.markKnow(al, p.o, p.d, T.klv, 'study'); }
          const x = w.forecastFor(al, { airline: al.id, base: p.o, dest: p.d, type_id: t, freq: 1, fare_out: p.fare, fare_in: p.fare, service: 'standard', buffer: 'normal' }, { nDraws: T.draws, seed: 13, know: p.know || undefined });
          p[t] = x.db2; n++;
          if (x.db2 > 0) sum += x.db2;
          if (!best || x.db2 > best.db2) best = { o: p.o, d: p.d, db2: r0(x.db2), lf: x.lf };
        }
        if (!n) continue;
        const X = P.AIRCRAFT_TYPES[t], seatsS = X.seats.standard;
        const hourCost = (X.fuel_bh_kg * w.fuelPrice + X.maint_bh + X.crew_bh) * w.macro.cpi, fixedDay = aircraftDayFixedGeneric(t);
        tab.push({ type: t, seats: seatsS, range: X.range_km, fits: n, sumPos: r0(sum), best, costSeatH: Math.round(hourCost / seatsS * 100) / 100, fixedDay: r0(fixedDay), leaseMonth: r0(X.lease_month * P.EURUSD / w.macro.eurusd), deposit: r0(acquireCost(al, t, 'lease', null, w.macro.eurusd, w)), buy: r0(X.value_eur * (X.age >= 10 ? 1 : 1.08)), mode: X.age >= 10 || X.noFactory ? 'gebraucht' : 'ab Werk', stock: w.lessorStock[t] ?? stockCap(t), known: al.familyKnown(t) });
      }
      tab.sort((a, b) => b.sumPos - a.sumPos);
      res.rows = tab.slice(0, Math.max(T.top, 4));
      // Typwechsel auf eigenen Strecken
      const swaps = [];
      for (const p of pairs.filter((q) => q.own)) { const cur = p[p.cur]; let bt = null; for (const t of types) if (p[t] !== undefined && (bt === null || p[t] > p[bt])) bt = t; if (bt && bt !== p.cur && cur !== undefined && p[bt] - cur > 1500) swaps.push({ o: p.o, d: p.d, from: p.cur, to: bt, gain: r0(p[bt] - cur) }); }
      res.swaps = swaps.sort((a, b) => b.gain - a.gain).slice(0, T.top);
      res.examined = pairs.length; res.pool = types.length;
      const b = res.rows[0];
      const noBuy = b && !(b.sumPos > 0);
      res.title = !b ? 'Keine Empfehlung' : noBuy ? 'Keine Neuanschaffung empfohlen' : `Empfehlung: ${P.AIRCRAFT_TYPES[b.type].label}`;
      res.summary = `${types.length} Muster auf ${pairs.length} Strecken durchgerechnet (${own.length} eigene, ${pairs.length - own.length} neue Kandidaten${f ? ', Schwerpunkt ' + focusLabel(f) : ''}).`;
      const nb = noBuy ? res.rows.filter((x) => x.best).sort((x, y) => y.best.db2 - x.best.db2)[0] || b : b;
      if (noBuy) res.rec = { text: 'Kein Muster verdient auf den untersuchten neuen Strecken mit einem Flug täglich Geld – ein zusätzliches Flugzeug lohnt sich derzeit nicht.', why: `Am nächsten an der Gewinnschwelle: ${P.AIRCRAFT_TYPES[nb.type].label} auf ${nb.best ? `${nb.best.o}–${nb.best.d} (${nb.best.db2} EUR/Tag)` : '–'}. Besser zuerst die eigene Flotte auslasten oder mit einer Basisanalyse neue Märkte suchen.` };
      else if (b) res.rec = { text: `${P.AIRCRAFT_TYPES[b.type].label}: zusammen rund ${b.sumPos} EUR DB2 pro Tag auf den passenden Strecken, am besten ${b.best.o}–${b.best.d} (${b.best.db2} EUR/Tag).`, why: `${b.seats} Sitze, ${b.range} km Reichweite, ${b.costSeatH} EUR Betriebskosten je Sitz und Blockstunde. Leasing ${b.leaseMonth} EUR/Monat, Kaution ${b.deposit} EUR${b.known ? '' : ' plus Einführung einer neuen Familie'}.`, act: { t: 'aircraft', type: b.type } };
      if (res.swaps.length) res.notes.push(`Auf ${res.swaps.length} eigenen Strecken würde ein anderes Muster mehr verdienen – siehe Typwechsel.`);
      res.growth = b && b.sumPos > 30000 ? 'hoch' : b && b.sumPos > 5000 ? 'mittel' : 'gering';
    } else if (rep.kind === 'base') {
      const cands = AP_CODES.filter((c) => !al.bases.includes(c) && inFocus(f, c) && (ap(c).pax || 0) >= (rep.tier === 'small' ? 8 : 2)).sort((a, b) => (ap(b).pax || 0) - (ap(a).pax || 0)).slice(0, T.baseCand);
      const nDest = rep.tier === 'small' ? 4 : rep.tier === 'extended' ? 6 : 8;
      const tab = [];
      for (const B of cands) {
        const ds = AP_CODES.filter((d) => d !== B && routeKmOk(B, d) && studyTypes(w, al, B, d).length).map((d) => [d, potSum(B, d)]).sort((a, b) => b[1] - a[1]).slice(0, nDest);
        const ev = ds.map(([d]) => studyEval(w, al, B, d, { ...T, fares: [1.0], draws: Math.min(2, T.draws) })).filter(Boolean).sort((a, b) => b.db2 - a.db2);
        const pos = ev.filter((x) => x.db2 > 0), top = pos.slice(0, 5);
        const fixed = (P.BASE_FIXED_DAY + P.TERMINALS.std.rent * apx(B).cost / 30.4) * w.macro.cpi;
        const net = top.reduce((s, x) => s + x.db2, 0) - fixed;
        const rivals = w.list.filter((x) => x.id !== al.id && x.status !== 'insolvent' && x.bases.includes(B)).map((x) => x.name);
        const reach = AP_CODES.filter((d) => d !== B && routeKmOk(B, d) && rangeOk(B, d, 'A20N')).length;
        tab.push({ apt: B, name: ap(B).name, country: ap(B).country, pax: ap(B).pax, routes: top.map((x) => ({ d: x.d, type: x.type, db2: r0(x.db2), lf: x.lf })), pos: pos.length, tested: ev.length, net: r0(net), fixedDay: r0(fixed), setup: r0(P.BASE_SETUP_COST * w.macro.cpi), rivals, reach, slots: isFinite(w.slotsFree(B)) ? w.slotsFree(B) : null });
      }
      tab.sort((a, b) => b.net - a.net);
      res.rows = tab.slice(0, T.top); res.examined = cands.length;
      const b = res.rows[0];
      res.title = b && b.net > 0 ? `Bester Standort: ${b.name} (${b.apt})` : 'Kein Standort trägt sich sofort';
      res.summary = `${cands.length} Flughäfen${f ? ` (${focusLabel(f)})` : ''} als Basis geprüft, je bis zu ${nDest} Ziele mit der Prognose durchgerechnet.`;
      if (b) res.rec = { text: b.net > 0 ? `${b.name}: die fünf besten Strecken bringen zusammen rund ${b.net} EUR pro Tag nach den Basiskosten.` : `${b.name} ist am aussichtsreichsten, deckt die Basiskosten aber noch nicht (${b.net} EUR/Tag).`, why: `Einmalig ${b.setup} EUR, laufend ${b.fixedDay} EUR pro Tag. ${b.reach} Ziele mit dem A320neo erreichbar${b.rivals.length ? `, Konkurrenz vor Ort: ${b.rivals.slice(0, 3).join(', ')}` : ', keine Konkurrenz-Basis vor Ort'}.`, act: { t: 'base', apt: b.apt, setup: b.setup, fixedDay: b.fixedDay, net: b.net } };
      res.growth = b && b.net > 20000 ? 'hoch' : b && b.net > 0 ? 'mittel' : 'gering';
      res.notes.push('Netzwert = Summe der fünf besten Streckenbeiträge (je 1× täglich, eigenes Flugzeug je Strecke) minus Basis- und Terminalkosten. Flugzeuge, Personal und Anlaufzeit kommen hinzu.');
    } else {
      // Wettbewerb und Marktlücken
      const svc = new Map();
      for (const x of w.list) { if (x.status === 'insolvent') continue; for (const r of x.activeRoutes()) { if (r.opened_day > w.day) continue; const k = pairKey(r.base, r.dest); const h = r.hist.slice(-30), pax = h.reduce((a2, q) => a2 + (q.pax || 0), 0), seats = h.reduce((a2, q) => a2 + (q.seats || 0), 0);
        const e = svc.get(k) || { ops: [], seats: 0 }; e.ops.push({ id: x.id, name: x.name, me: x.id === al.id, freq: r.freq, fare: Math.round((r.fare_out + r.fare_in) / 2), lf: seats ? pax / seats : null, db: x.id === al.id ? null : routeDb(r, 30, x) }); e.seats += r.seats() * r.freq * 2; svc.set(k, e); } }
      const ends = new Set(al.bases);
      const pool = [];
      const big = AP_CODES.filter((c) => (ap(c).pax || 0) >= (rep.tier === 'full' ? 3 : 8) && inFocus(f, c));
      const origins = rep.tier === 'small' ? [...ends] : [...new Set([...ends, ...big.slice(0, rep.tier === 'full' ? 40 : 15)])];
      for (const o of origins) for (const d of (f ? big : AP_CODES)) {
        if (o >= d && origins.includes(d)) continue;
        if (o === d || !routeKmOk(o, d)) continue;
        const k = pairKey(o, d), e = svc.get(k), pot = potSum(o, d) * 2;
        if (pot < 40) continue;
        const ops = e ? e.ops.filter((q) => !q.me) : [], meOn = e ? e.ops.some((q) => q.me) : false;
        if (meOn) continue;
        const lf = ops.length ? ops.reduce((a2, q) => a2 + (q.lf || 0) * q.freq, 0) / Math.max(1, ops.reduce((a2, q) => a2 + q.freq, 0)) : null;
        const seats = e ? e.seats : 0, cover = seats / Math.max(1, pot);
        let cat = null, score = 0;
        if (!ops.length) { cat = 'unbedient'; score = pot; }
        else if (lf !== null && lf > 0.88) { cat = 'voll ausgelastet'; score = pot * 0.6 * lf; }
        else if (cover < 0.35) { cat = 'unterversorgt'; score = pot * (0.35 - cover) * 2; }
        else if (ops.some((q) => q.db !== null && q.db > 8000)) { cat = 'hohe Margen'; score = pot * 0.3; }
        if (!cat) continue;
        pool.push({ o, d, k, pot, ops, lf, cover, cat, score, mine: ends.has(o) || ends.has(d) });
      }
      pool.sort((a, b) => b.score - a.score);
      const pack = (g) => {
        const from = ends.has(g.o) ? g.o : ends.has(g.d) ? g.d : null, to = from === g.o ? g.d : g.o;
        const ent = from && studyTypes(w, al, from, to).length ? studyEval(w, al, from, to, T) : null;
        return { o: g.o, d: g.d, cat: g.cat, pot: r0(g.pot), seats: Math.round(g.cover * g.pot), lf: g.lf, ops: g.ops.slice(0, 3).map((q) => ({ name: q.name, freq: q.freq, fare: q.fare, lf: q.lf })), entry: ent ? { from, to, type: ent.type, fare: ent.fare, db2: r0(ent.db2), lf: ent.lf } : null, needBase: from ? null : g.o };
      };
      // zuerst Lücken an Ihren Basen (mit Einstiegsprognose), dann die größten anderswo
      const mineP = pool.filter((g) => g.mine), other = pool.filter((g) => !g.mine);
      res.rows = mineP.slice(0, T.top).map(pack).sort((a, b) => (b.entry ? b.entry.db2 : -1e12) - (a.entry ? a.entry.db2 : -1e12));
      res.others = other.slice(0, T.top).map(pack);
      res.countMine = mineP.length; res.countOther = other.length;
      // Wettbewerb auf eigenen Strecken
      res.mine = al.activeRoutes().map((r) => { const e = svc.get(pairKey(r.base, r.dest)); const ops = e ? e.ops.filter((q) => !q.me) : []; const my = e ? e.ops.find((q) => q.me) : null;
        return { o: r.base, d: r.dest, myFare: Math.round((r.fare_out + r.fare_in) / 2), myLf: my ? my.lf : null, ops: ops.slice(0, 3).map((q) => ({ name: q.name, freq: q.freq, fare: q.fare, lf: q.lf })) }; }).filter((x) => x.ops.length).slice(0, 12);
      res.examined = pool.length;
      const b = res.rows.find((x) => x.entry && x.entry.db2 > 0) || res.others[0] || res.rows[0];
      res.title = `${mineP.length} Lücken an Ihren Basen, ${other.length} anderswo`;
      res.summary = `Untersucht: Nachfrage gegen Sitzangebot aller Airlines${f ? ` mit Schwerpunkt ${focusLabel(f)}` : ''}. Unbedient = keine Direktverbindung, voll = Konkurrenz über 88 % ausgelastet, unterversorgt = wenig Sitze für das Potenzial.`;
      if (b && b.entry && !(b.entry.db2 > 0)) res.rec = { text: `${b.entry.from}–${b.entry.to} (${b.cat}) ist die größte Lücke an Ihren Basen, ein Einstieg rechnet sich aber noch nicht (${b.entry.db2} EUR DB2 pro Tag mit ${P.AIRCRAFT_TYPES[b.entry.type].label}).`, why: 'Mit einem kleineren Muster, anderem Tarif oder später bei wachsender Nachfrage erneut prüfen – oder mit der Basisanalyse dort ansetzen, wo die Lücken größer sind.', act: null };
      else if (b) res.rec = b.entry ? { text: `${b.entry.from}–${b.entry.to} (${b.cat}): Ihr Einstieg mit ${P.AIRCRAFT_TYPES[b.entry.type].label} brächte rund ${b.entry.db2} EUR DB2 pro Tag.`, why: b.ops.length ? `Heute fliegen ${b.ops.map((q) => q.name).join(', ')}.` : 'Heute fliegt dort niemand direkt.', act: b.entry.db2 > 0 ? { t: 'route', o: b.entry.from, d: b.entry.to, type: b.entry.type, fare: b.entry.fare } : null } : { text: `${ap(b.o).name}–${ap(b.d).name} (${b.cat}) ist die größte Lücke, liegt aber nicht an Ihren Basen.`, why: 'Eine Basis an einem Ende wäre nötig – die Basisanalyse rechnet das durch.', act: { t: 'basecheck', apt: b.o } };
      res.growth = pool.length > 20 ? 'hoch' : pool.length > 5 ? 'mittel' : 'gering';
      res.notes.push('Margen und Auslastung der Konkurrenz stammen aus deren letzten 30 Tagen. Wo Sie nicht an einem Ende eine Basis haben, ist kein Einstieg gerechnet.');
    }
    res.risks = res.risks.concat(rep.kind === 'routes' || rep.kind === 'gaps' ? ['Konkurrenten reagieren oft mit Preisen oder mehr Flügen, sobald Sie einsteigen.'] : [], band > 0.15 ? ['Ohne erfahrene Marktanalyse im Team sind die Zahlen unsicherer (Personal → Fachkräfte).'] : []);
    return res;
  }
  /** Vorauswahl: die aussichtsreichsten freien Ziele nach Potenzial (sonst wären es über 100 Ziele je Basis). */
  function aiCandidates(al, base, served, k) {
    const maxR = Math.max(...al.cfg.pref_types.map((t) => P.AIRCRAFT_TYPES[t].range_km));
    return AP_CODES.filter((d) => d !== base && !served.has(base + d) && destFits(al.archetype, base, d) && gcDistanceKm(base, d) * P.ROUTE_DETOUR <= maxR)
      .sort((a, b) => potSum(base, b) - potSum(base, a)).slice(0, k);
  }
  /** Konkurrenz reagiert auf Menschen: profitable Strecken werden angegriffen, umkämpfte Strecken zugeballert. */
  function aiAttack(w, al) {
    const day = w.day, r = w.rng, aggr = aggrOf(w), cfg = al.cfg;
    const zeal = { lcc: 1.25, premium: 1.0, leisure: 0.7, regional: 0.6 }[al.archetype] || 1;
    let best = null;
    for (const h of w.humans) {
      if (h.status === 'insolvent') continue;
      for (const hr of h.activeRoutes()) {
        if (day - hr.opened_day < 35 || hr.hist.length < 14) continue;
        const pair = pairKey(hr.base, hr.dest), n = Math.min(30, hr.hist.length), db = routeDb(hr, 30, h) / n;
        const lf = routeLf(hr, 14);
        const mine = pairRoute(al, pair);
        if (mine) {
          // Kapazität gegen Menschen hochfahren, wenn der Markt es hergibt
          if ((lf > 0.72 || db > 0) && mine.freq < 5 && day - mine.lastChange > 45 && w.slotsOkFor(al, mine.base, mine.dest, 1) && r.random() < 0.45 * aggr * zeal) {
            const h2 = rotationHours(mine.base, mine.dest, mine.type_id, mine.service, mine.buffer);
            if (!(al.spareCapacity(day, mine.type_id, mine.base, h2) || (al.fleet.length < al.maxFleet && al.ledger.cash / 100 > 10e6 && aiEnsureCapacity(w, al, mine.type_id, mine.base, h2, 1)))) continue;
            mine.freq++; mine.lastChange = day; w.takeSlots(al, mine.base, mine.dest, 1);
            w.pushNews(day, `${al.name} stockt ${ap(mine.base).name}–${ap(mine.dest).name} auf ${mine.freq}x täglich auf – Kampf um die Strecke mit ${h.name}`, 'ai', al.id);
            h.log(day, `${al.name} erhöht auf ${hr.base}–${hr.dest} auf ${mine.freq} Flüge täglich und drückt die Preise.`, 'warn');
          }
          continue;
        }
        const from = al.bases.includes(hr.base) ? hr.base : al.bases.includes(hr.dest) ? hr.dest : null;
        if (!from || db <= 0) continue;
        const to = from === hr.base ? hr.dest : hr.base;
        if (barred(w, al.id, from, to)) continue;
        const score = db * (lf > 0.8 ? 1.3 : 1) * (1 + (al.grudge && al.grudge[h.id] ? 0.5 : 0));
        if (!best || score > best.score) best = { score, h, hr, from, to, db };
      }
    }
    if (!best || r.random() > Math.min(0.9, 0.5 * aggr * zeal)) return false;
    if (al.fleet.length >= al.maxFleet || al.ledger.cash / 100 < 15e6) return false;
    const { h, hr, from, to } = best;
    const typeId = (cfg.pref_types || []).find((t) => rangeOk(from, to, t)); if (!typeId) return false;
    const freq = Math.max(1, Math.min(3, hr.freq));
    if (!w.slotsOkFor(al, from, to, freq)) return false;
    const x = aiSpec(w, al, from, to, typeId, freq);
    const undercut = { lcc: 0.15, leisure: 0.10, regional: 0.05, premium: 0.0 }[al.archetype] || 0.05;
    const hOut = from === hr.base ? hr.fare_out : hr.fare_in, hIn = from === hr.base ? hr.fare_in : hr.fare_out;
    x.spec.fare_out = Math.min(x.spec.fare_out, hOut * (1 - undercut)); x.spec.fare_in = Math.min(x.spec.fare_in, hIn * (1 - undercut));
    const res = aiEval(w, al, x, null, 3);
    if (res.db2 < -3000 * aggr) return false;
    const h2 = rotationHours(from, to, typeId, x.spec.service, x.spec.buffer);
    if (!aiEnsureCapacity(w, al, typeId, from, h2, 3)) return false;
    aiOpen(w, al, x.spec, `Angriff auf ${h.name}`);
    h.log(day, `${al.name} greift Ihre Strecke ${hr.base}–${hr.dest} an: ${freq}x täglich ab ${Math.round(Math.min(x.spec.fare_out, x.spec.fare_in))} EUR.`, 'crit');
    if (al.grudge && al.grudge[h.id]) al.grudge[h.id] = Math.max(0, al.grudge[h.id] - 3);
    return true;
  }
  /** KI-Airlines werben Personal und Fachkräfte bei Menschen ab, die unter Marktniveau zahlen oder schlechte Stimmung haben. */
  function aiPoachHumans(w) {
    const r = w.rng, day = w.day, M = w.macro, aggr = aggrOf(w);
    for (const h of w.humans) {
      if (h.status === 'insolvent' || !h.staff) continue;
      const st = h.staff, grudge = w.list.reduce((s, a) => s + ((a.grudge && a.grudge[h.id]) || 0), 0);
      const acLv = h.academy && h.academy.pilot ? h.academy.pilot.lv || 0 : 0;
      const p = (1 - 0.12 * acLv) * (0.05 + 1.4 * Math.max(0, (M.wage || 1) - st.pay) + 0.9 * Math.max(0, 0.6 - st.morale) + Math.min(0.3, grudge * 0.03)) * aggr;
      if (r.random() < p) {
        const g = STAFF_GROUPS.slice().sort((a, b) => st.pil[b] - st.pil[a])[0];
        const ai = w.list.filter((a) => a.archetype && a.status === 'active' && a.fleet.some((x) => P.AIRCRAFT_TYPES[x.type_id].group === g));
        if (g && st.pil[g] >= 6 && ai.length) {
          const a = r.pick(ai), n = Math.min(Math.floor(st.pil[g] * 0.2), r.int(2, 6));
          if (n > 0) {
            st.pil[g] -= n; st.morale = clamp(st.morale - 0.03, 0, 1);
            h.log(day, `${a.name} hat ${n} ${roleLabel('pilot', g)} abgeworben. ${st.pay < (M.wage || 1) ? 'Ihr Gehalt liegt unter dem Marktniveau.' : 'Die Stimmung ist schlecht.'}`, 'crit');
            w.pushNews(day, `${a.name} wirbt ${n} Piloten bei ${h.name} ab`, 'ai', a.id);
            if (a.grudge && a.grudge[h.id]) a.grudge[h.id] = Math.max(0, a.grudge[h.id] - n);
          }
        } else if (st.cab >= 20 && ai.length) {
          const a = r.pick(ai), n = Math.min(Math.floor(st.cab * 0.12), r.int(4, 12));
          st.cab -= n; st.morale = clamp(st.morale - 0.02, 0, 1);
          h.log(day, `${a.name} hat ${n} Flugbegleiterinnen abgeworben.`, 'warn');
        }
      }
      // Fachkräfte: wer gut ist, wird umworben
      if (h.experts.length && r.random() < 0.05 * aggr * h.experts.length) {
        const e = r.pick(h.experts), a = r.pick(w.list.filter((x) => x.archetype && x.status === 'active'));
        if (a && r.random() < (0.35 + 0.1 * (e.level - 1)) * w.poachShield(e, day)) {
          h.experts = h.experts.filter((x) => x !== e);
          if (P.EXPERT_ROLES[e.role].unique) a.experts.push(expertJoin(w, { ...e, salary: Math.round(e.salary * 1.15 / 1000) * 1000 }, day));
          if (e.nca) { const comp = Math.round(e.salary * P.EXPERT_CONTRACT.ncaComp); h.ledger.post('experts', comp); h.log(day, `Wettbewerbsverbot greift: ${a.name} zahlt ${Math.round(comp / 1000)} Tsd. EUR Ablöse für ${e.name}.`, 'good'); }
          h.log(day, `${e.name} (${P.EXPERT_ROLES[e.role].label}) wechselt zu ${a.name} – ein besseres Angebot.`, 'crit');
          w.pushNews(day, `${a.name} holt ${e.name} von ${h.name}`, 'ai', a.id);
        }
      }
    }
  }
  /** Neue Airlines drängen in den Markt, wenn andere aufgeben. */
  /** KI-Airlines buhlen um Tim Kaminski – und lassen ihn nach einer Weile wieder ziehen. */
  function aiStar(w) {
    const r = w.rng, day = w.day, aggr = aggrOf(w);
    for (const S of P.STAR_CONSULTANTS) {
      const holder = w.starHolder(S.id);
      if (holder) {
        if (!holder.archetype) continue;
        const e = holder.experts.find((x) => x.id === S.id);
        if (day - (e.hiredDay || 0) > 150 && r.random() < 0.25) {
          holder.experts = holder.experts.filter((x) => x !== e);
          w.pushNews(day, `${S.name} verlässt ${holder.name} – das Mandat ist beendet`, 'info', holder.id);
          w.ensureStar();
        }
        continue;
      }
      const c = w.candidates.find((x) => x.id === S.id);
      if (!c || day - (c.since ?? day) < 45) continue;
      const rich = w.list.filter((a) => a.archetype && a.status === 'active' && a.ledger.cash / 100 > S.aiCash && !a.experts.some((x) => P.EXPERT_ROLES[x.role].unique));
      if (rich.length && r.random() < 0.2 * aggr) {
        const a = r.pick(rich);
        a.experts.push(expertJoin(w, { ...c }, day)); a.ledger.post('experts', -(P.EXPERT_ROLES[S.role].signOn + c.salary));
        w.candidates = w.candidates.filter((x) => x !== c);
        w.pushNews(day, `${a.name} holt ${S.name} als Berater`, 'ai', a.id);
      }
    }
  }
  /** KI: Flugzeugzeit für einen Umlauf beschaffen. Reicht es am Ende nicht, werden die eben bestellten,
   *  noch nicht gelieferten Leasingflugzeuge ohne Strafe storniert – sonst stünden sie ungenutzt herum
   *  und würden nach 45 Tagen mit Vertragsstrafe zurückgegeben. */
  function aiCancelLease(w, al, ac) {
    al.fleet = al.fleet.filter((a) => a !== ac);
    if (ac.deposit) al.ledger.cashOnly(ac.deposit, 'deposit_back');
    w.lessorStock[ac.type_id] = (w.lessorStock[ac.type_id] ?? capOf(w, ac.type_id)) + 1;
    if (w.lessorQueue) w.lessorQueue[ac.type_id] = Math.max(0, (w.lessorQueue[ac.type_id] || 1) - 1);
    if (w.labor) w.labor.aiAc = Math.max(0, (w.labor.aiAc || 1) - 1);
  }
  function aiEnsureCapacity(w, al, typeId, base, hours, tries) {
    const day = w.day, added = [];
    let guard = 0;
    while (!al.spareCapacity(day, typeId, base, hours) && guard++ < tries) { const ac = al.acquire(day, typeId, base, 'lease', null, w); if (!ac) break; added.push(ac); }
    if (al.spareCapacity(day, typeId, base, hours)) return true;
    for (const ac of added) aiCancelLease(w, al, ac);
    return false;
  }
  function aiNewEntrant(w) {
    const r = w.rng, day = w.day, ai = w.list.filter((a) => a.archetype), active = ai.filter((a) => a.status !== 'insolvent');
    if (day < 90 || active.length >= Object.keys(AI_SETUP).length || r.random() > 0.35) return;
    const names = ['Aurora Air', 'Zephyr Airways', 'Horizon Express', 'Polaris Jet', 'Meridia', 'Skyline Connect', 'Falcon Wings', 'Coral Air', 'Sirocco Airlines', 'Northwind', 'Altair Airways', 'Equator Air', 'Halcyon', 'Vega Jet'];
    const used = new Set(w.list.map((a) => a.name)), name = names.find((n) => !used.has(n)); if (!name) return;
    const taken = new Set(active.flatMap((a) => a.bases));
    let bases = AP_CODES.filter((c) => !taken.has(c) && (ap(c).pax || 0) >= 15 && !(apx(c).slots !== null && w.slotsFree(c) < 3) && !w.lockOwner(c));
    if (!bases.length) return;
    // Neue Konkurrenz entsteht bevorzugt dort, wo noch kaum KI-Airlines sitzen (Länder ohne eigene KI-Basis)
    const aiCountries = new Set([...taken].map((c) => ap(c).country));
    const fresh = bases.filter((c) => !aiCountries.has(ap(c).country));
    if (fresh.length && r.random() < 0.7) bases = fresh;
    const base = r.pick(bases), arch = r.pick(['lcc', 'lcc', 'premium', 'leisure', 'regional']);
    const eq = { lcc: 90e6, premium: 160e6, leisure: 70e6, regional: 50e6 }[arch];
    const colors = new Set(active.map((a) => a.color)), color = Array.from({ length: AI_COLOR_N }, (_, i) => i + 1).find((c) => !colors.has(c)) || 1;
    w.entrantCounter = (w.entrantCounter || 0) + 1;
    const al = w.add(new Airline('N' + w.entrantCounter, name, base, arch, eq, 25, color));
    al.sigma = (DIFFICULTY[w.difficulty] || DIFFICULTY.normal).aiSigma;
    if (arch === 'premium') al.prefTypes = ['A20N', 'A21N', 'A359'];
    const served = new Set();
    let n = 0;
    for (const dest of aiCandidates(al, base, served, 12)) {
      if (n >= 3) break;
      const typeId = al.cfg.pref_types.find((t) => rangeOk(base, dest, t)); if (!typeId || !w.slotsOkFor(al, base, dest, 1)) continue;
      const x = aiSpec(w, al, base, dest, typeId, 1);
      if (!al.acquire(day, typeId, base, 'lease', null, w)) continue;
      aiOpen(w, al, x.spec, 'Markteintritt'); n++;
    }
    w.pushNews(day, `Neue Airline am Markt: ${name} (${P.AI_ARCHETYPES[arch].label}) startet in ${ap(base).name}`, 'info', al.id);
    for (const h of w.humans) if (h.bases.includes(base) || h.activeRoutes().some((rt) => rt.base === base || rt.dest === base)) h.log(day, `Neue Konkurrenz: ${name} startet in ${ap(base).name}.`, 'warn');
  }
  function aiMonthly(w, al) {
    const cfg = al.cfg, day = w.day;
    for (const r of al.activeRoutes()) {
      if (day - r.opened_day < 60 || day - r.lastChange < 60) continue;
      const db = routeDb(r, 30, al), lf = routeLf(r, 30);
      r.reviewNeg = db < 0 ? r.reviewNeg + 1 : 0;
      if (r.reviewNeg >= 2) {
        if (r.freq > 1) { r.freq--; r.reviewNeg = 0; r.lastChange = day; for (const x of [r.base, r.dest]) al.hold(x, 1, day + SLOT_HOLD_DAYS); w.pushNews(day, `${al.name} reduziert ${ap(r.base).name}–${ap(r.dest).name} auf ${r.freq}x täglich`, 'ai', al.id); }
        else { al.closeRoute(day, r, 'zwei Monate negativer Streckenbeitrag'); w.pushNews(day, `${al.name} stellt ${ap(r.base).name}–${ap(r.dest).name} ein`, 'ai', al.id); }
      } else if (lf > 0.90 && db > 0 && r.freq < 8 && w.slotsOkFor(al, r.base, r.dest, 1)) {
        if (al.spareCapacity(day, r.type_id, r.base, rotationHours(r.base, r.dest, r.type_id, r.service, r.buffer))) { r.freq++; r.lastChange = day; w.takeSlots(al, r.base, r.dest, 1); w.pushNews(day, `${al.name} erhöht ${ap(r.base).name}–${ap(r.dest).name} auf ${r.freq}x täglich`, 'ai', al.id); }
      }
    }
    w.operableFreq(al);
    for (const a of al.fleet.slice()) if (a.idle_days >= 45 && a.delivery_day < day && a.status === 'ok') al.dispose(day, a, 'dauerhaft ungenutzt');
    if (al.fleet.length >= al.maxFleet) return;
    if (aiAttack(w, al)) return;
    if (monthOf(day) % 3 === 0 && aiBaseExpansion(w, al)) return;
    const reserve = 60 * (6000 + al.fleet.reduce((s, a) => s + aircraftDayFixedGeneric(a.type_id), 0));
    if (al.ledger.cash / 100 < reserve) return;
    const served = new Set(al.activeRoutes().flatMap((r) => [r.base + r.dest, r.dest + r.base]));
    const monthEval = al.archetype === 'leisure' ? (monthOf(day) + 1) % 12 : null;
    let best = null;
    // Zweistufig: erst alle Kandidaten mit 1x täglich, dann nur die besten vier mit mehr Frequenz (spart ~60 % Rechenzeit)
    const first = [];
    for (const base of al.bases) for (const dest of aiCandidates(al, base, served, 10)) {
      if (barred(w, al.id, base, dest)) continue;
      for (const typeId of cfg.pref_types) {
        if (!rangeOk(base, dest, typeId) || !w.slotsOkFor(al, base, dest, 1)) continue;
        const x = aiSpec(w, al, base, dest, typeId, 1), res = aiEval(w, al, x, monthEval, 3);
        first.push([res.db2, base, dest, typeId]);
        if (res.margin >= cfg.min_margin + 0.05 && res.db2 > 0 && (!best || res.db2 > best[0])) best = [res.db2, x.spec];
      }
    }
    for (const [, base, dest, typeId] of first.sort((a, b) => b[0] - a[0]).slice(0, 4)) {
      for (const freq of [2, 3]) {
        if (!w.slotsOkFor(al, base, dest, freq)) continue;
        const x = aiSpec(w, al, base, dest, typeId, freq), res = aiEval(w, al, x, monthEval, 3);
        if (res.margin >= cfg.min_margin + 0.05 && res.db2 > 0 && (!best || res.db2 > best[0])) best = [res.db2, x.spec];
      }
    }
    if (best) {
      const [, spec] = best, h = rotationHours(spec.base, spec.dest, spec.type_id, spec.service, spec.buffer);
      if (!aiEnsureCapacity(w, al, spec.type_id, spec.base, h, 4)) return;
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
    SAV: ['Savanna Airways', 'premium', 'ADD', 150e6, 35, [['NBO', 'A20N', 3], ['LOS', 'B789', 1], ['JNB', 'B789', 1], ['DXB', 'A20N', 2], ['CAI', 'A20N', 2], ['ACC', 'A20N', 1], ['DAR', 'A20N', 2], ['FRA', 'B789', 1]], ['A20N', 'B789']],
    CAP: ['Cape Horizon', 'premium', 'JNB', 120e6, 30, [['CPT', 'A20N', 5], ['NBO', 'A20N', 2], ['LOS', 'A20N', 1], ['MRU', 'A20N', 1], ['DAR', 'A20N', 1], ['LHR', 'A359', 1], ['DXB', 'A359', 1]], ['A20N', 'A359']],
    ATS: ['Atlas Sky', 'lcc', 'CMN', 70e6, 20, [['CDG', 'A20N', 3], ['MAD', 'A20N', 2], ['BCN', 'A20N', 1], ['ORY', 'A20N', 2], ['DSS', 'A20N', 1], ['TUN', 'A20N', 1], ['FCO', 'A20N', 1]], ['A20N']],
    NIL: ['Nile Star', 'premium', 'CAI', 100e6, 25, [['JED', 'A20N', 3], ['DXB', 'A20N', 2], ['LHR', 'A20N', 1], ['IST', 'A20N', 2], ['ADD', 'A20N', 1], ['FRA', 'A20N', 1], ['JFK', 'B789', 1]], ['A20N', 'B789']],
    SAH: ['Sahel Express', 'lcc', 'LOS', 60e6, 18, [['ACC', 'B38M', 3], ['DSS', 'B38M', 1], ['JNB', 'B38M', 1], ['NBO', 'B38M', 1], ['CMN', 'B38M', 1]], ['B38M']],
    BOS: ['Bosporus Airlines', 'premium', 'IST', 300e6, 60, [['FRA', 'A21N', 3], ['LHR', 'A21N', 2], ['CDG', 'A21N', 2], ['JFK', 'B77W', 1], ['DXB', 'A21N', 2], ['CAI', 'A21N', 2], ['TUN', 'A20N', 1], ['AMS', 'A21N', 2], ['MUC', 'A21N', 2]], ['A21N', 'A20N', 'B77W']],
    CEL: ['Celtic Jet', 'lcc', 'DUB', 90e6, 25, [['LGW', 'B38M', 3], ['MAN', 'B38M', 2], ['BCN', 'B38M', 1], ['FCO', 'B38M', 1], ['AMS', 'B38M', 2], ['CDG', 'B38M', 2], ['PMI', 'B38M', 1], ['MAD', 'B38M', 1], ['FRA', 'B38M', 1]], ['B38M']],
    MES: ['Meseta Air', 'premium', 'MAD', 200e6, 40, [['BCN', 'A20N', 4], ['LIS', 'A20N', 3], ['CDG', 'A20N', 2], ['LHR', 'A20N', 2], ['FCO', 'A20N', 2], ['MEX', 'A359', 1], ['BOG', 'A359', 1], ['GRU', 'A359', 1], ['CMN', 'A20N', 2]], ['A20N', 'A359']],
    NOR: ['Nordlys', 'regional', 'CPH', 50e6, 14, [['AMS', 'E295', 2], ['BER', 'E295', 2], ['FRA', 'E295', 2], ['LHR', 'E295', 1], ['MUC', 'E295', 1], ['DUS', 'E295', 1], ['VIE', 'E295', 1]], ['E295']],
    QMR: ['Qamar Airways', 'premium', 'DOH', 400e6, 60, [['LHR', 'A359', 2], ['CDG', 'A359', 1], ['FRA', 'A359', 1], ['BKK', 'B789', 1], ['BOM', 'A21N', 3], ['DEL', 'A21N', 2], ['JNB', 'B789', 1], ['NBO', 'A21N', 2], ['CAI', 'A21N', 2], ['IST', 'A21N', 2], ['JFK', 'B77W', 1]], ['A21N', 'A359', 'B789']],
    IND: ['Indus Air', 'lcc', 'DEL', 150e6, 50, [['BOM', 'A21N', 8], ['BLR', 'A21N', 5], ['HYD', 'A20N', 4], ['DXB', 'A21N', 3], ['SIN', 'A21N', 1], ['BKK', 'A21N', 2]], ['A20N', 'A21N']],
    // Neu in 0.13: Heimatmärkte in Ozeanien, Kanada, Russland und Südamerika
    CRL: ['Coralsea Airways', 'premium', 'SYD', 180e6, 35, [['MEL', 'A21N', 3], ['BNE', 'A21N', 2], ['PER', 'A21N', 2], ['AKL', 'A21N', 2], ['ADL', 'A20N', 1], ['OOL', 'A20N', 1], ['CHC', 'A20N', 1], ['LAX', 'B789', 1], ['NRT', 'B789', 1]], ['A20N', 'A21N', 'B789']],
    WAT: ['Wattle Jet', 'lcc', 'MEL', 80e6, 22, [['SYD', 'A20N', 2], ['BNE', 'A20N', 1], ['OOL', 'A20N', 1], ['ADL', 'A20N', 1], ['PER', 'A21N', 1], ['HBA', 'A20N', 1], ['CNS', 'A20N', 1], ['AKL', 'A21N', 1]], ['A20N', 'A21N']],
    MPL: ['Maple Crest Air', 'premium', 'YYZ', 220e6, 40, [['YUL', 'A21N', 2], ['YVR', 'A21N', 1], ['YYC', 'A21N', 1], ['YOW', 'E295', 2], ['YHZ', 'A20N', 1], ['LGA', 'A20N', 3], ['ORD', 'A20N', 2], ['LHR', 'B789', 1], ['CUN', 'A21N', 1], ['YWG', 'E295', 1]], ['A20N', 'A21N', 'E295', 'B789']],
    CSC: ['Cascadia Jet', 'lcc', 'YVR', 80e6, 20, [['YYC', 'B38M', 1], ['YEG', 'B38M', 1], ['YYZ', 'B38M', 1], ['LAX', 'B38M', 1], ['SFO', 'B38M', 1], ['YWG', 'B38M', 1], ['PHX', 'B38M', 1], ['LAS', 'B38M', 1]], ['B38M']],
    VLG: ['Volga Avia', 'premium', 'SVO', 200e6, 40, [['LED', 'A21N', 3], ['AER', 'A21N', 1], ['SVX', 'A20N', 1], ['KZN', 'A20N', 1], ['OVB', 'A21N', 1], ['IST', 'A21N', 1], ['DXB', 'A21N', 1], ['KGD', 'A20N', 1], ['UFA', 'A20N', 1]], ['A20N', 'A21N', 'A359']],
    PMP: ['Pampero', 'lcc', 'EZE', 70e6, 20, [['COR', 'A20N', 1], ['MDZ', 'A20N', 1], ['BRC', 'A20N', 1], ['SCL', 'A20N', 2], ['GRU', 'A21N', 2], ['GIG', 'A20N', 1], ['LIM', 'A21N', 1]], ['A20N', 'A21N']],
  };
  const AI_COLORS = { AUR: 1, KES: 2, REG: 3, SOL: 4, ALB: 5, LUM: 6, GLF: 7, ATC: 8, LIB: 9, SKR: 10, MRD: 11, DRG: 12, AND: 13, IND: 14,
    SAV: 15, CAP: 16, ATS: 17, NIL: 18, SAH: 19, BOS: 20, CEL: 21, MES: 22, NOR: 23, QMR: 24, CRL: 25, WAT: 26, MPL: 27, CSC: 28, VLG: 29, PMP: 30 };
  const AI_COLOR_N = 30;
  /** Stärke der KI-Konkurrenz – unabhängig von der Schwierigkeit (Startkapital, Schocks). */
  const RIVALS = {
    easy: { label: 'Einfach', desc: 'zurückhaltend, schätzt Märkte ungenau, kämpft selten um Preise', aggr: 0.5, sigma: 0.25, fight: 0.5, cost: 1.06 },
    normal: { label: 'Mittel', desc: 'greift profitable Strecken an, wirbt ab, solide Preispolitik', aggr: 1.0, sigma: 0.12, fight: 1.0, cost: 1.0 },
    hard: { label: 'Stark', desc: 'aggressiv, präzise Planung, harte Preiskämpfe, schlanke Kosten', aggr: 1.6, sigma: 0.06, fight: 1.4, cost: 0.95 },
  };
  const rivalsOf = (w) => RIVALS[w.rivals] || RIVALS.normal;
  /** Aggressivität der KI: Konkurrenz-Einstellung, sonst wie früher aus der Schwierigkeit. */
  const aggrOf = (w) => (w.rivals ? rivalsOf(w).aggr : (DIFFICULTY[w.difficulty] || DIFFICULTY.normal).aggr || 1);
  function setRivals(w, key) {
    if (!RIVALS[key]) return false;
    w.rivals = key;
    for (const al of w.list) if (al.archetype) al.sigma = RIVALS[key].sigma;
    return true;
  }
  const DIFFICULTY = {
    easy: { label: 'Zugänglich', equity: 25e6, aiSigma: 0.25, events: 0.9, cycle: 0.05, aggr: 0.6 },
    normal: { label: 'Realistisch', equity: 16e6, aiSigma: 0.12, events: 1.35, cycle: 0.08, aggr: 1.0 },
    hard: { label: 'Experte', equity: 10e6, aiSigma: 0.08, events: 1.8, cycle: 0.11, aggr: 1.4 },
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
  function newWorld({ difficulty = 'normal', rivals = null, seed = (Date.now() >>> 0), mode = 'free' } = {}) {
    const w = new World(seed);
    w.mode = mode === 'career' ? 'career' : 'free';
    const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    w.eventMult = diff.events; w.difficulty = difficulty;
    w.rivals = RIVALS[rivals] ? rivals : ({ easy: 'easy', normal: 'normal', hard: 'hard' }[difficulty] || 'normal');
    w.macro.cycle = { phase: w.rng.range(0, 6.283), period: w.rng.int(40, 70), amp: diff.cycle };
    for (const [id, setup] of Object.entries(AI_SETUP)) bootstrapAi(w, id, setup, RIVALS[w.rivals].sigma);
    w.initSlots();
    w.refreshOffers();
    setFuelX(w);
    return w;
  }
  const HUMAN_IDS = ['P1', 'P2', 'P3', 'P4'];
  /** Zeitstufen: Millisekunden echter Zeit je Spieltag. Langsame Stufen laufen auch weiter, wenn niemand online ist. */
  const SLOT_HOLD_DAYS = 180;
  const SPEEDS = {
    p: { label: 'Pause', short: 'Pause', ms: 0, slow: false },
    h1: { label: 'Langzeit (1 Tag = 1 Std.)', short: '1 Std./Tag', ms: 3600000, slow: true },
    m30: { label: 'Dauerspiel (1 Tag = 30 Min.)', short: '30 Min./Tag', ms: 1800000, slow: true },
    m10: { label: 'Gemächlich (1 Tag = 10 Min.)', short: '10 Min./Tag', ms: 600000, slow: true },
    m1: { label: 'Zügig (1 Tag = 1 Min.)', short: '1 Min./Tag', ms: 60000, slow: true, noTheme: true },
    x1: { label: 'Schnell (1 Tag = 12 Sek.)', short: '1×', ms: 12000, slow: false },
    x2: { label: 'Schneller (1 Tag = 6 Sek.)', short: '2×', ms: 6000, slow: false },
    x4: { label: 'Sehr schnell (1 Tag = 3 Sek.)', short: '4×', ms: 3000, slow: false },
    x10: { label: 'Turbo (1 Tag = 1,2 Sek.)', short: '10×', ms: 1200, slow: false, local: true },
  };
  // 'rt' (Echtzeit) gibt es nicht mehr – alte Spiele laufen mit 1 Tag = 1 Std. weiter
  const speedKey = (v) => (SPEEDS[v] ? v : v === 'rt' ? 'h1' : ({ 0: 'p', 1: 'x1', 2: 'x2', 4: 'x4', 10: 'x10' }[Number(v)] || 'p'));
  /** Menschliche Airline hinzufügen (Einzelspieler: PLY; Mehrspieler: P1–P4). */
  function addHuman(w, { id = null, name = 'Hanse Air', code = 'HX', base = 'HAM', difficulty = null, owner = null } = {}) {
    if (!P.AIRPORTS[base]) throw new Error('Unbekannter Flughafen');
    { const bad = startBaseMsg(w, base); if (bad) throw new Error(bad); }
    const diff = DIFFICULTY[difficulty || w.difficulty] || DIFFICULTY.normal;
    if (!id) { id = HUMAN_IDS.find((x) => !w.airlines[x]); for (let n = 5; !id; n++) if (!w.airlines['P' + n]) id = 'P' + n; }
    const humans = w.humans.length;
    const al = w.add(new Airline(id, name, base, null, diff.equity, 99, (humans % 8) + 1));
    al.code = code; al.difficulty = difficulty || w.difficulty || 'normal'; al.owner = owner; al.joinedDay = w.day;
    if ((w.mode || 'free') === 'career') al.prog = { lv: 0, since: w.day, acq: [] };
    al.station(base);
    w.newEntrantSlots(base);
    { const lic = licenceFee(w, base); if (lic > 0) { al.ledger.post('one_off', -lic); al.log(w.day, `Betriebslizenz und Gründung am Heimatflughafen ${ap(base).name}: ${Math.round(lic / 1000)} Tsd. EUR`, 'info'); } }
    al.log(w.day, `${name} gegründet in ${ap(base).name}, Startkapital ${(diff.equity / 1e6).toFixed(0)} Mio. EUR`, 'info');
    if (humans > 0 || w.day > 0) w.pushNews(w.day, `Neue Airline am Markt: ${name} mit Basis ${ap(base).name}`, 'info', id);
    al._day = w.day;
    return al;
  }
  /**
   * Neustart einer menschlichen Airline (nach Insolvenz oder freiwillig): Die alte Gesellschaft wird abgewickelt,
   * unter derselben Kennung startet eine neue Airline mit vollem Startkapital. Leasingflugzeuge gehen an die
   * Leasinggeber zurück, offene Handelsangebote, Kooperationen und Gebote verfallen.
   */
  /**
   * Spielleitung: menschliche Airline aus dem Spiel nehmen. Strecken enden, Leasingflugzeuge gehen zurück,
   * Slots, Gates, Handelsangebote, Kooperationen und Gebote verfallen. Die Airline bleibt als „entfernt“ in den Listen.
   */
  function kickHuman(w, id, by = 'Spielleitung') {
    const al = w.airlines[id];
    if (!al || !al.isPlayer) return { ok: false, msg: 'Unbekannte Airline.' };
    if (al.removed) return { ok: false, msg: 'Diese Airline ist schon entfernt.' };
    const day = w.day;
    for (const a of al.fleet) if (!a.owned) { w.lessorStock = w.lessorStock || {}; if (w.lessorStock[a.type_id] !== undefined) w.lessorStock[a.type_id]++; }
    for (const d of w.deals || []) if (d.status === 'open' && (d.from === id || d.to === id)) d.status = 'expired';
    w.agreements = (w.agreements || []).filter((g) => g.airline !== id && g.partner !== id);
    w.coops = (w.coops || []).filter((c) => c.a !== id && c.b !== id);
    for (const a of w.auctions || []) if (!a.done && a.bids) delete a.bids[id];
    for (const x of w.list) { if (x.grudge && x.grudge[id] !== undefined) delete x.grudge[id]; }
    for (const r of al.activeRoutes()) { r.closed = true; r.closedDay = day; }
    al.fleet = []; al.slotHold = {}; al.experts = []; al.decisions = []; al.plans = [];
    w.slotWait = (w.slotWait || []).filter((e) => e.al !== id);
    delete al.gateLock; delete al.hubs; delete al.loyalty;
    al.status = 'insolvent'; al.removed = true; al.removedDay = day; al.owner = null;
    al.log(day, `${by}: Die Airline wurde aus dem Spiel genommen`, 'crit');
    w.pushNews(day, `${al.name} wurde von der ${by} aus dem Spiel genommen`, 'warn', id);
    return { ok: true, name: al.name };
  }
  /** Spielleitung: Kapital zuschießen oder abziehen (Korrektur), als Eigenkapitalbewegung gebucht. */
  function adminGrant(w, id, amount, by = 'Spielleitung') {
    const al = w.airlines[id], amt = Math.round(clamp(Number(amount) || 0, -100e6, 100e6) / 1e4) * 1e4;
    if (!al || !al.isPlayer || al.removed) return { ok: false, msg: 'Unbekannte Airline.' };
    if (!amt) return { ok: false, msg: 'Bitte einen Betrag angeben.' };
    al.ledger.cash += Math.round(amt * 100); al.ledger.equityContrib = (al.ledger.equityContrib || 0) + Math.round(amt * 100);
    al.log(w.day, `${by}: Kapitalkorrektur ${amt > 0 ? '+' : '−'}${Math.round(Math.abs(amt) / 1e4) / 100} Mio. EUR`, amt > 0 ? 'info' : 'warn');
    return { ok: true };
  }
  /** Ereignisse für die Spielleitung: laufend, angekündigt, airlinebezogen und kürzlich annulliert. */
  function adminEvents(w) {
    const day = w.day;
    return w.events.filter((e) => e.cancelled ? e.end > day - 30 : e.end + (e.recovery || 0) > day || (e.applied && e.end > day - 60 && ['tax_change', 'carbon', 'fee_hike'].includes(e.type)) || (['rate_change', 'fx_shock', 'fuel_spike', 'fuel_drop'].includes(e.type) && e.start > day - 60))
      .map((e) => ({ id: e.id, type: e.type, text: e.text, start: e.start, end: e.end, airline: e.airline || null, scope: e.scope || null, cancelled: !!e.cancelled, severity: e.severity || null }))
      .sort((a, b) => a.cancelled - b.cancelled || b.start - a.start);
  }
  function restartHuman(w, id, { name, code, base, difficulty = null } = {}) {
    const old = w.airlines[id];
    if (!old || old.archetype) return { ok: false, msg: 'Unbekannte Airline.' };
    if (!P.AIRPORTS[base]) return { ok: false, msg: 'Bitte eine Heimatbasis wählen.' };
    { const bad = startBaseMsg(w, base); if (bad) return { ok: false, msg: bad }; }
    const day = w.day, bs = balanceSheet(old);
    for (const a of old.fleet) if (!a.owned) { w.lessorStock = w.lessorStock || {}; if (w.lessorStock[a.type_id] !== undefined) w.lessorStock[a.type_id]++; }
    for (const d of w.deals || []) if (d.status === 'open' && (d.from === id || d.to === id)) d.status = 'expired';
    w.agreements = (w.agreements || []).filter((g) => g.airline !== id && g.partner !== id);
    w.coops = (w.coops || []).filter((c) => c.a !== id && c.b !== id);
    for (const a of w.auctions || []) if (!a.done && a.bids) delete a.bids[id];
    w.slotWait = (w.slotWait || []).filter((e) => e.al !== id);
    for (const al of w.list) { if (al.grudge && al.grudge[id] !== undefined) delete al.grudge[id]; }
    const past = [...(old.past || []), { name: old.name, code: old.code, from: old.joinedDay || 0, to: day, status: old.status, equity: Math.round(bs.equity), pax: Math.round(old.paxTotal || 0) }].slice(-10);
    const wasInsolvent = old.status === 'insolvent';
    if (!wasInsolvent) w.pushNews(day, `${old.name} stellt den Flugbetrieb ein und wird abgewickelt`, 'warn', id);
    const pos = w.order.indexOf(id);
    delete w.airlines[id];
    w.order = w.order.filter((k) => k !== id);
    const al = addHuman(w, { id, name: name || old.name, code: code || old.code, base, difficulty: difficulty || old.difficulty, owner: old.owner });
    // dieselbe Stelle in der Reihenfolge und dieselbe Farbe wie bisher
    w.order = w.order.filter((k) => k !== id); w.order.splice(pos < 0 ? w.order.length : pos, 0, id);
    al.color = old.color; al.past = past; al.assistant = old.assistant || null; al.logo = old.logo && al.name === old.name ? old.logo : null;
    al.log(day, `Neustart: ${old.name} wurde ${wasInsolvent ? 'nach der Insolvenz ' : ''}abgewickelt, ${al.name} beginnt mit frischem Kapital`, 'info');
    return { ok: true, airline: al };
  }
  function newGame({ name = 'Hanse Air', code = 'HX', base = 'HAM', difficulty = 'normal', rivals = null, seed = (Date.now() >>> 0), mode = 'free' } = {}) {
    const w = newWorld({ difficulty, rivals, seed, mode });
    addHuman(w, { id: 'PLY', name, code, base, difficulty });
    w.playerId = 'PLY';
    return w;
  }

  // ===========================================================================
  // Handel zwischen Airlines: Flugzeuge, Personal, Slots, Geld, Streckenausstieg
  // ===========================================================================
  // Ein Angebot (deal) geht von „from“ an „to“. give = was from abgibt, take = was from dafür haben will.
  // Positionen: {k:'cash', amount} · {k:'ac', id} · {k:'staff', role, group, n} · {k:'slots', apt, n} · {k:'exit', pair, days, withSlots}
  // Geld und Buchwerte laufen über das Ergebniskonto „trade“, damit Bilanz und Ergebnis zusammenpassen.
  const DEAL_DAYS = 14, DEAL_MAX_OPEN = 10, EXIT_DAYS = [180, 365, 730];
  const coordinated = (apt) => !!P.AIRPORTS[apt];
  function acFairValue(w, ac) { const t = P.AIRCRAFT_TYPES[ac.type_id], age = ac.age0 + Math.max(0, w.day - ac.bornDay) / 365; return t.value_eur * Math.max(0.2, 1 - 0.045 * age); }
  function acBookValue(ac) { return (ac.owned ? ac.nbv - ac.loan : 0) + (ac.deposit || 0); }
  // ---------------------------------------------------------------------------
  // Übernahmen (M&A): Spielende kaufen eine KI-Airline mit allem – Flotte, Strecken, Basen, Slots, Personal, Kasse und Schulden
  // ---------------------------------------------------------------------------
  function maValue(w, ai) {
    const bs = balanceSheet(ai), ms = ai.ledger.months.slice(-6);
    let prof = 0; for (const m of ms) for (const k in m.acc) if (!k.startsWith('cf_')) prof += m.acc[k];
    const profM = ms.length ? prof / 100 / ms.length : 0, M = P.MA;
    const price = Math.max(M.min * w.macro.cpi, (Math.max(0, bs.equity) + M.earnX * 12 * Math.max(0, profM)) * M.premium);
    return { equity: Math.round(bs.equity), profM: Math.round(profM), price: Math.round(price / 1e5) * 1e5, fleet: ai.fleet.length, routes: ai.activeRoutes().length, bases: ai.bases.slice() };
  }
  function maBlock(w, al, ai) {
    if (!al.isPlayer) return 'Nur Spielende können übernehmen.';
    if (!ai || ai.isPlayer || !ai.archetype) return 'Übernehmen lassen sich nur KI-Airlines.';
    if (ai.status === 'insolvent') return `${ai.name} ist nicht mehr am Markt.`;
    const L = careerOf(al);
    if (L && !L.ma) { const nx = CAREER.levels.findIndex((x) => x.ma); return `Übernahmen gibt es ab Phase ${nx + 1} „${CAREER.levels[nx].label}“ (${needTxt(CAREER.levels[nx].need)}).`; }
    return null;
  }
  function takeover(w, al, targetId) {
    const ai = w.airlines[targetId], bad = maBlock(w, al, ai); if (bad) return { ok: false, msg: bad };
    const v = maValue(w, ai), day = w.day;
    if (al.spendable(w.macro.bank ?? 1) < v.price) return { ok: false, msg: `${ai.name} kostet ${Math.round(v.price / 1e6 * 10) / 10} Mio. EUR – dafür reicht auch der Dispo nicht.` };
    const eqAi = balanceSheet(ai).equity;
    // Geld und Schulden
    al.ledger.cashOnly(-v.price, 'ma');
    al.ledger.cashOnly(ai.ledger.cash / 100, 'ma_cash');
    al.creditUsed += ai.creditUsed || 0;
    for (const l of ai.loans || []) al.loans.push(l);
    al.ledger.post('one_off', eqAi - v.price, false);   // Prämie über dem Buchwert (Firmenwert) wird sofort abgeschrieben
    // Basen, Stationen, Slots
    for (const b of ai.bases) if (!al.bases.includes(b)) { al.bases.push(b); al.station(b); }
    for (const [apt, hs] of Object.entries(ai.slotHold || {})) { const n = hs.reduce((x, h) => x + (h.until > day ? h.n : 0), 0); if (n > 0) al.hold(apt, n, 0, true); }
    // Flotte
    const idMap = {};
    for (const a of ai.fleet) {
      al.acCounter++;
      const nid = `${al.id}-${String(al.acCounter).padStart(3, '0')}`; idMap[a.id] = nid;
      if (!al.typesIntroduced.includes(a.type_id)) al.typesIntroduced.push(a.type_id);
      Object.assign(a, { id: nid, base: al.bases.includes(a.base) ? a.base : al.bases[0], assigned: [], used_hours: 0, idle_days: 0, prevOwner: ai.name, mode: 'auto', pins: [] });
      al.fleet.push(a);
    }
    // Strecken
    let nR = 0;
    for (const r of ai.activeRoutes()) {
      const dup = al.activeRoutes().find((x) => pairKey(x.base, x.dest) === pairKey(r.base, r.dest));
      r.closed = true; r.closedDay = day;
      if (dup) { dup.freq = Math.min(8, dup.freq + r.freq); continue; }
      al.routeCounter++;
      const { id, airline, hist, pending, ...rest } = r;
      const nr = new Route({ ...rest, id: `${al.id}-R${al.routeCounter}`, airline: al.id, autoPrice: false, closed: false, closedDay: null, pending: [], hist: hist.slice() });
      nr.ap = al.apDefault || 0.85; if (al.apCfg) nr.apo = { ...al.apCfg };
      if (!al.bases.includes(nr.base)) { al.bases.push(nr.base); al.station(nr.base); }
      al.station(nr.base); al.station(nr.dest);
      al.routes.push(nr); nR++;
    }
    // Personal: Die Belegschaft kommt mit
    w.operableFreq(al);
    const need = al.staffNeedPlanned(0, day), st = al.staff; let staffN = 0;
    for (const g of STAFF_GROUPS) { const add = Math.max(0, need.pil[g] - st.pil[g]); st.pil[g] += add; staffN += add; }
    { const add = Math.max(0, need.cab - st.cab); st.cab += add; staffN += add; }
    { const add = Math.max(0, Math.ceil(need.tech) - st.tech); st.tech += add; staffN += add; }
    // Die übernommene Airline verschwindet vom Markt
    ai.fleet = []; ai.loans = []; ai.creditUsed = 0; ai.ledger.cash = 0; ai.slotHold = {};
    ai.status = 'insolvent'; ai.mergedInto = al.id; ai.mergedDay = day;
    for (const d of w.deals || []) if (d.status === 'open' && (d.from === ai.id || d.to === ai.id)) d.status = 'expired';
    w.coops = (w.coops || []).filter((c) => c.a !== ai.id && c.b !== ai.id);
    w.agreements = (w.agreements || []).filter((g) => g.airline !== ai.id && g.partner !== ai.id);
    for (const a of w.auctions || []) if (!a.done && a.bids) delete a.bids[ai.id];
    al.log(day, `Übernahme: ${ai.name} gehört jetzt Ihnen – ${v.fleet} Flugzeuge, ${nR} Strecken, Basen ${ai.bases.join(', ')}, ${staffN} Beschäftigte. Kaufpreis ${Math.round(v.price / 1e5) / 10} Mio. EUR${v.price > eqAi ? `, davon ${Math.round((v.price - eqAi) / 1e5) / 10} Mio. EUR Prämie über dem Buchwert (sofort abgeschrieben)` : ''}.`, 'good');
    w.pushNews(day, `${al.name} übernimmt ${ai.name}`, 'info', al.id);
    w.operableFreq(al);
    return { ok: true, price: v.price, fleet: v.fleet, routes: nR, staff: staffN };
  }
  /** Wert einer Flugzeugübernahme für einen neutralen Käufer: Eigentum = Marktwert minus übernommener Kredit; Leasing = Kaution plus halbe Monatsrate (sofort verfügbar). */
  function acDealValue(w, ac) { return ac.owned ? acFairValue(w, ac) - ac.loan : (ac.deposit || 0) + (ac.flex ? 0.25 : 0.5) * (ac.leaseMonth || 0); }
  const w_isMulti = (w) => w.humans && w.humans.length > 1;
  /** Slotpreis: steigt mit der Größe des Flughafens (London über 2 Mio. €, Bremen unter 100.000 €) und mit der Knappheit. */
  function slotValue(w, apt) { if (!coordinated(apt)) return 0; const S = P.SLOT_RULE, scarce = w.slotsFree(apt) <= 0 ? 2 : 1; return S.priceBase * Math.max(0.3, ap(apt).pax || 0.3) ** S.priceExp * scarce * w.macro.cpi; }
  /** Lizenz/Stationseröffnung für Spielende beim ersten Anflug eines Flughafens. */
  function licenceFee(w, apt) { const S = P.SLOT_RULE; return Math.round(S.licenceBase * Math.max(0.3, ap(apt).pax || 0.3) ** S.licenceExp * w.macro.cpi / 1000) * 1000; }
  function staffUnitCost(role, group) { const S = P.STAFF; const sal = role === 'pilot' ? S.pilotSalary[group] : role === 'cabin' ? S.cabinSalary : S.techSalary; return S.recruit[role] + sal; }
  const pairRoute = (al, pair) => al.activeRoutes().find((r) => pairKey(r.base, r.dest) === pair);
  function barred(w, alId, a, b) { const k = pairKey(a, b); return (w.agreements || []).some((g) => g.airline === alId && g.pair === k && g.until > w.day); }
  /** Was ein Ausstieg die aussteigende Airline kostet (entgangener Streckenbeitrag über die Laufzeit, mindestens ein Sockel). */
  function exitLoss(w, al, pair, days) {
    const r = pairRoute(al, pair);
    if (!r) return 30000 * w.macro.cpi;
    const n = Math.max(1, Math.min(30, r.hist.length)), db = routeDb(r, 30, al) / n;
    return Math.max(50000 * w.macro.cpi, db * Math.min(days, 365) * 0.8 + r.freq * 20000 * w.macro.cpi);
  }
  /** Was der Ausstieg eines Konkurrenten der begünstigten Airline bringt (gewonnene Passagiere mal Marge). */
  function exitGain(w, receiver, giver, pair, days) {
    const gr = pairRoute(giver, pair); if (!gr) return 10000 * w.macro.cpi;
    const h = gr.hist.slice(-14), n = Math.max(1, h.length);
    const pax = h.length ? h.reduce((s, x) => s + x.pax, 0) / n : gr.seats() * gr.freq * 2 * 0.7;
    const fare = (gr.fare_out + gr.fare_in) / 2, share = pairRoute(receiver, pair) ? 0.4 : 0.1;
    return pax * share * fare * 0.18 * Math.min(days, 365);
  }
  const MARKET = 'MARKET';
  /** Flugzeuge einer Airline, die zu einem Gesuch passen (Typ oder Familie), ungenutzte zuerst. */
  function acMatches(w, al, it) {
    return al.fleet.filter((a) => a.delivery_day <= w.day && !(a.acmi && a.acmi.end > w.day) && (it.fam ? P.AIRCRAFT_TYPES[a.type_id].group === P.AIRCRAFT_TYPES[it.type].group : a.type_id === it.type)
      && (!it.maxAge || al.acAge(a, w.day) <= it.maxAge)).sort((x, y) => (x.used_hours || 0) - (y.used_hours || 0) || al.acAge(x, w.day) - al.acAge(y, w.day));
  }
  /** Gesuch „irgendein Flugzeug vom Typ X“ in konkrete Flugzeuge des Gebers auflösen. ids: Wunschauswahl. */
  function resolveItems(w, giver, items, ids = null) {
    const out = [];
    for (const it of items) {
      if (it.k !== 'acAny') { out.push({ ...it }); continue; }
      const pool = acMatches(w, giver, it).filter((a) => !out.some((x) => x.k === 'ac' && x.id === a.id));
      const pick = ids ? pool.filter((a) => ids.includes(a.id)).slice(0, it.n) : pool.slice(0, it.n);
      if (pick.length < it.n) return null;
      for (const a of pick) out.push({ k: 'ac', id: a.id });
    }
    return out;
  }
  function cleanItems(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const it of arr.slice(0, 12)) {
      if (!it || typeof it !== 'object') continue;
      if (it.k === 'cash') { const amount = Math.round(num(it.amount)); if (amount > 0 && amount <= 5e8) out.push({ k: 'cash', amount }); }
      else if (it.k === 'ac' && typeof it.id === 'string' && it.id.length < 30) { if (!out.some((x) => x.k === 'ac' && x.id === it.id)) out.push({ k: 'ac', id: it.id }); }
      else if (it.k === 'acAny' && P.AIRCRAFT_TYPES[it.type] && !P.AIRCRAFT_TYPES[it.type].launch) out.push({ k: 'acAny', type: it.type, fam: !!it.fam, n: clamp(Math.round(num(it.n, 1)), 1, 4), maxAge: it.maxAge ? clamp(Math.round(num(it.maxAge)), 1, 30) : null });
      else if (it.k === 'staff' && ['pilot', 'cabin', 'tech'].includes(it.role)) {
        const group = it.role === 'pilot' ? (STAFF_GROUPS.includes(it.group) ? it.group : null) : null, n = clamp(Math.round(num(it.n)), 0, 60);
        if (n > 0 && (it.role !== 'pilot' || group)) out.push({ k: 'staff', role: it.role, group, n });
      } else if (it.k === 'slots' && coordinated(it.apt)) { const n = clamp(Math.round(num(it.n)), 0, 8); if (n > 0) out.push({ k: 'slots', apt: it.apt, n }); }
      else if (it.k === 'coop' && ['codeshare', 'alliance'].includes(it.kind)) {
        const days = EXIT_DAYS.includes(num(it.days)) ? num(it.days) : 365;
        if (it.kind === 'alliance') { if (!out.some((x) => x.k === 'coop' && x.kind === 'alliance')) out.push({ k: 'coop', kind: 'alliance', pair: null, days }); }
        else if (typeof it.pair === 'string') { const [a, b] = it.pair.split('-'); if (P.AIRPORTS[a] && P.AIRPORTS[b] && a !== b) out.push({ k: 'coop', kind: 'codeshare', pair: pairKey(a, b), days }); }
      }
      else if (it.k === 'exit' && typeof it.pair === 'string') {
        const [a, b] = it.pair.split('-');
        if (P.AIRPORTS[a] && P.AIRPORTS[b] && a !== b) out.push({ k: 'exit', pair: pairKey(a, b), days: EXIT_DAYS.includes(num(it.days)) ? num(it.days) : 365, withSlots: !!it.withSlots });
      }
    }
    return out;
  }
  /** Prüft, ob „giver“ die Positionen abgeben kann. Gibt eine Fehlermeldung oder null zurück. */
  function checkSide(w, giver, receiver, items) {
    const cash = items.filter((x) => x.k === 'cash').reduce((s, x) => s + x.amount, 0);
    if (cash > 0 && giver.spendable(w.macro.bank ?? 1) < cash) return `${giver.name} hat nicht genug Geld – auch nicht mit Dispo.`;
    const staff = {}, slots = {};
    for (const it of items) {
      if (it.k === 'ac') {
        const a = giver.fleet.find((x) => x.id === it.id);
        if (!a) return `Das Flugzeug ${it.id} gehört nicht (mehr) ${giver.name}.`;
        if (a.delivery_day > w.day) return `${it.id} ist noch nicht ausgeliefert.`;
        if (a.acmi && a.acmi.end > w.day) return `${it.id} ist verchartert.`;
        if (receiver && !receiver.isPlayer && receiver.fleet.length >= receiver.maxFleet) return `${receiver.name} hat keinen Platz für weitere Flugzeuge.`;
      } else if (it.k === 'staff') { const key = it.role === 'pilot' ? it.group : it.role; staff[key] = (staff[key] || 0) + it.n; }
      else if (it.k === 'slots') slots[it.apt] = (slots[it.apt] || 0) + it.n;
    }
    if (giver.isPlayer) for (const [key, n] of Object.entries(staff)) {
      const have = key === 'cabin' ? giver.staff.cab : key === 'tech' ? giver.staff.tech : giver.staff.pil[key];
      if (have < n) return `${giver.name} hat nur ${have} ${key === 'cabin' ? 'Flugbegleiterinnen' : key === 'tech' ? 'Techniker' : 'Piloten (' + P.TYPE_GROUPS[key] + ')'}.`;
    }
    for (const [apt, n] of Object.entries(slots)) if (giver.heldAt(apt, w.day) < n) return `${giver.name} hält in ${apt} nur ${giver.heldAt(apt, w.day)} freie Slots.`;
    return null;
  }
  function itemText(w, it, giver) {
    if (it.k === 'cash') return `${Math.round(it.amount).toLocaleString('de-DE')} EUR`;
    if (it.k === 'acAny') return `${it.n} × ${it.fam ? P.TYPE_GROUPS[P.AIRCRAFT_TYPES[it.type].group] + ' (beliebiges Muster)' : P.AIRCRAFT_TYPES[it.type].label}${it.maxAge ? `, höchstens ${it.maxAge} Jahre alt` : ''}`;
    if (it.k === 'ac') { const a = giver && giver.fleet.find((x) => x.id === it.id); return a ? `${P.AIRCRAFT_TYPES[a.type_id].label} (${a.owned ? 'Eigentum' : 'Leasing'}, ${Math.round(a.age0 + Math.max(0, w.day - a.bornDay) / 365)} J.)` : it.desc || `Flugzeug ${it.id}`; }
    if (it.k === 'staff') return `${it.n} ${it.role === 'pilot' ? 'Piloten (' + P.TYPE_GROUPS[it.group] + ')' : it.role === 'cabin' ? 'Flugbegleiterinnen' : 'Techniker'}`;
    if (it.k === 'slots') return `${it.n} ${it.n === 1 ? 'Slot' : 'Slots'} in ${it.apt}`;
    if (it.k === 'exit') return `Rückzug von ${it.pair.replace('-', '–')} für ${Math.round(it.days / 30)} Monate${it.withSlots ? ' inkl. Slots' : ''}`;
    if (it.k === 'coop') return it.kind === 'alliance' ? `Allianz für ${Math.round(it.days / 30)} Monate (Codeshare auf allen gemeinsamen Strecken, gemeinsamer Kerosineinkauf)` : `Codeshare auf ${it.pair.replace('-', '–')} für ${Math.round(it.days / 30)} Monate`;
    return '?';
  }
  function dealText(w, d) {
    const A = w.airlines[d.from], B = d.to === MARKET ? { name: 'der Markt', fleet: [] } : w.airlines[d.to];
    const g = d.give.map((x) => itemText(w, x, A)).join(', ') || 'nichts', t = d.take.map((x) => itemText(w, x, B)).join(', ') || 'nichts';
    return `${A.name} gibt ${g} · ${B.name} gibt ${t}`;
  }
  /** Bewertung aus Sicht einer KI-Airline. value > 0 heißt: lohnt sich. need = Geld, das zur Zustimmung fehlt. */
  function aiDealValue(w, ai, d) {
    const partner = w.airlines[ai.id === d.from ? d.to : d.from];
    const aiGives = ai.id === d.from ? d.give : d.take, aiGets = ai.id === d.from ? d.take : d.give;
    const cfg = ai.cfg || {}, why = [];
    let vin = 0, vout = 0;
    for (const it of aiGets) {
      if (it.k === 'cash') vin += it.amount;
      else if (it.k === 'ac') {
        const a = partner.fleet.find((x) => x.id === it.id); if (!a) continue;
        const pref = (cfg.pref_types || []).includes(a.type_id), fam = ai.familyKnown(a.type_id);
        if (ai.fleet.length >= ai.maxFleet) why.push('Flotte voll');
        vin += acDealValue(w, a) * (pref ? 1 : fam ? 0.8 : 0.5) * (partner.oldAcExpert && partner.oldAcExpert() && partner.acAge(a, w.day) >= P.OLD_AC_AGE ? 1.1 : 1);
      } else if (it.k === 'staff') vin += it.n * P.STAFF.recruit[it.role] * 0.5;
      else if (it.k === 'slots') vin += slotValue(w, it.apt) * (ai.bases.includes(it.apt) || ai.activeRoutes().some((r) => r.base === it.apt || r.dest === it.apt) ? 0.8 : 0.3);
      else if (it.k === 'exit') vin += exitGain(w, ai, partner, it.pair, it.days) * (it.withSlots ? 1.15 : 1);
    }
    for (const it of aiGives) {
      if (it.k === 'cash') { vout += it.amount; if (ai.ledger.cash / 100 - it.amount < 5e6) why.push('zu wenig Liquidität'); }
      else if (it.k === 'ac') { const a = ai.fleet.find((x) => x.id === it.id); if (!a) continue; vout += (acDealValue(w, a) * (a.used_hours > 0 ? 1.15 : 1.02) + (a.used_hours > 0 && !a.owned ? (a.leaseMonth || 0) : 0)) * (partner.oldAcExpert && partner.oldAcExpert() && ai.acAge(a, w.day) >= P.OLD_AC_AGE ? 0.9 : 1); }
      else if (it.k === 'staff') vout += it.n * staffUnitCost(it.role, it.group) * 1.5 * w.macro.cpi;
      else if (it.k === 'slots') vout += slotValue(w, it.apt);
      else if (it.k === 'exit') {
        const r = pairRoute(ai, it.pair);
        let v = exitLoss(w, ai, it.pair, it.days);
        if (r && ai.bases.includes(r.base) && ai.archetype === 'premium') v *= 1.4;
        if (it.withSlots && r) v += [r.base, r.dest].filter(coordinated).reduce((s, x) => s + slotValue(w, x) * r.freq, 0) * 0.6;
        vout += v;
      }
    }
    for (const it of aiGets.concat(aiGives)) {
      if (it.k !== 'coop') continue;
      const months = it.days / 30;
      if (it.kind === 'codeshare') {
        const mr = pairRoute(ai, it.pair), pr = pairRoute(partner, it.pair);
        if (mr && pr) { const h = mr.hist.slice(-30), rev = h.length ? h.reduce((s, x) => s + x.rev, 0) / h.length : 0; vin += rev * 0.05 * 30 * months; }
        else if (mr) vin += 30000 * months; else vout += 20000 * months;
      } else {
        const overlap = partner.activeRoutes().filter((r) => pairRoute(ai, pairKey(r.base, r.dest))).length;
        if (ai.archetype === 'lcc') { vout += 1e9; why.push('keine Allianzen'); }
        else vin += (60000 - overlap * 40000) * months;
      }
    }
    const margin = Math.max(25000, 0.08 * (vin + vout) / 2) * (ai.archetype === 'lcc' ? 1.3 : 1);
    return { vin, vout, margin, value: vin - vout - margin, need: Math.max(0, vout + margin - vin), why };
  }
  const roundTo = (x, s) => Math.ceil(x / s) * s;
  function newDeal(w, from, to, give, take, note, extra = {}) {
    const d = { id: 'D' + (++w.dealCounter), from, to, day: w.day, expires: w.day + DEAL_DAYS, status: 'open', give, take, note: String(note || '').slice(0, 200), ...extra };
    for (const [items, owner] of [[give, w.airlines[from]], [take, w.airlines[to]]]) for (const it of items) if (it.k === 'ac') it.desc = itemText(w, it, owner);
    w.deals.push(d);
    if (w.deals.length > 200) w.deals = w.deals.filter((x) => x.status === 'open' || x.day > w.day - 400).slice(-200);
    return d;
  }
  /** Führt ein angenommenes Angebot aus. Alles oder nichts. */
  function executeDeal(w, d) {
    const A = w.airlines[d.from], B = w.airlines[d.to], day = w.day;
    if (!A || !B || A.status === 'insolvent' || B.status === 'insolvent') return { ok: false, msg: 'Eine der Airlines ist nicht mehr am Markt.' };
    const e1 = checkSide(w, A, B, d.give) || checkSide(w, B, A, d.take);
    if (e1) return { ok: false, msg: e1 };
    for (const [G, R, items] of [[A, B, d.give], [B, A, d.take]]) {
      for (const it of items) {
        if (it.k === 'cash') { G.ledger.post('trade', -it.amount); R.ledger.post('trade', it.amount); }
        else if (it.k === 'ac') {
          const a = G.fleet.find((x) => x.id === it.id), bv = acBookValue(a);
          G.fleet = G.fleet.filter((x) => x !== a);
          G.ledger.post('trade', -bv, false); R.ledger.post('trade', bv, false);
          if (!R.familyKnown(a.type_id)) R.ledger.post('one_off', -P.TYPE_INTRO_COST * (R.isPlayer ? 1 : 0.5));
          if (!R.typesIntroduced.includes(a.type_id)) R.typesIntroduced.push(a.type_id);
          R.acCounter++;
          Object.assign(a, { id: `${R.id}-${String(R.acCounter).padStart(3, '0')}`, base: R.bases.includes(a.base) ? a.base : R.bases[0], assigned: [], used_hours: 0, idle_days: 0, acmi: null, prevOwner: G.name, mode: 'auto', pins: [] });
          R.fleet.push(a);
        } else if (it.k === 'staff') {
          const key = it.role === 'pilot' ? null : it.role === 'cabin' ? 'cab' : 'tech';
          if (G.isPlayer) { if (key) G.staff[key] -= it.n; else G.staff.pil[it.group] -= it.n; }
          if (R.isPlayer) { if (key) R.staff[key] += it.n; else R.staff.pil[it.group] += it.n; }
        } else if (it.k === 'slots') { G.useHeld(it.apt, it.n, day); R.hold(it.apt, it.n, day + 365); const bv = G.slotDivest ? G.slotDivest(it.apt, it.n) : 0; if (bv) G.ledger.post('trade', -bv, false); }
        else if (it.k === 'coop') {
          w.coops = (w.coops || []).filter((c) => c.until > day && !(c.kind === it.kind && c.pair === it.pair && ((c.a === G.id && c.b === R.id) || (c.a === R.id && c.b === G.id))));
          w.coops.push({ a: G.id, b: R.id, kind: it.kind, pair: it.pair, until: day + it.days, deal: d.id });
        }
        else if (it.k === 'exit') {
          for (const r of G.activeRoutes().filter((x) => pairKey(x.base, x.dest) === it.pair)) {
            G.closeRoute(day, r, `Vereinbarung mit ${R.name}`);
            if (it.withSlots) for (const x of [r.base, r.dest]) if (coordinated(x)) { G.useHeld(x, r.freq, day); R.hold(x, r.freq, day + 365); }
          }
          w.agreements = (w.agreements || []).filter((g) => g.until > day);
          w.agreements.push({ airline: G.id, partner: R.id, pair: it.pair, until: day + it.days, deal: d.id });
        }
      }
    }
    w.operableFreq(A); w.operableFreq(B);
    d.status = 'accepted'; d.resolvedDay = day;
    const txt = dealText(w, d);
    A.log(day, `Handel mit ${B.name} abgeschlossen: ${txt}`, 'good');
    B.log(day, `Handel mit ${A.name} abgeschlossen: ${txt}`, 'good');
    w.pushNews(day, `Handel: ${txt}`, 'trade', A.isPlayer ? A.id : B.id);
    return { ok: true, msg: 'Handel abgeschlossen.' };
  }
  /** KI antwortet sofort: annehmen, ablehnen oder Gegenangebot mit angepasstem Geldbetrag. */
  function aiRespond(w, ai, d) {
    const human = w.airlines[d.from], ev = aiDealValue(w, ai, d);
    const name = ai.name;
    const err = checkSide(w, ai, human, d.take);
    if (err) { d.status = 'rejected'; d.resolvedDay = w.day; d.reply = `${name}: ${err}`; return; }
    if (ev.why.includes('Flotte voll')) { d.status = 'rejected'; d.resolvedDay = w.day; d.reply = `${name}: Wir haben keinen Platz für weitere Flugzeuge.`; return; }
    if (ev.why.includes('keine Allianzen')) { d.status = 'rejected'; d.resolvedDay = w.day; d.reply = `${name}: Als Low-Cost-Airline gehen wir keine Allianzen ein.`; return; }
    if (ev.value >= 0 && !ev.why.length) {
      const res = executeDeal(w, d);
      d.reply = res.ok ? `${name}: Einverstanden, wir haben einen Deal.` : `${name}: ${res.msg}`;
      if (!res.ok) { d.status = 'failed'; d.resolvedDay = w.day; }
      return;
    }
    const vol = ev.vin + ev.vout;
    if (ev.why.includes('zu wenig Liquidität') || ev.need > Math.max(3 * vol, 2e6) + 5e6 || (!d.give.length && !d.take.length)) {
      d.status = 'rejected'; d.resolvedDay = w.day;
      d.reply = `${name}: ${ev.why.includes('zu wenig Liquidität') ? 'So viel Geld wollen wir gerade nicht ausgeben.' : 'Daran haben wir kein Interesse.'}`;
      return;
    }
    // Gegenangebot: Geld zugunsten der KI verschieben
    let need = roundTo(ev.need * 1.05, 5000);
    const give = d.give.map((x) => ({ ...x })), take = d.take.map((x) => ({ ...x }));
    const aiPays = take.find((x) => x.k === 'cash'), humanPays = give.find((x) => x.k === 'cash');
    if (aiPays) { const cut = Math.min(aiPays.amount, need); aiPays.amount -= cut; need -= cut; }
    if (need > 0) { if (humanPays) humanPays.amount += need; else give.push({ k: 'cash', amount: need }); }
    const g2 = give.filter((x) => x.k !== 'cash' || x.amount > 0), t2 = take.filter((x) => x.k !== 'cash' || x.amount > 0);
    d.status = 'countered'; d.resolvedDay = w.day;
    // Gegenangebot aus Sicht der KI: KI gibt, was der Mensch haben wollte (t2), und verlangt g2
    const c = newDeal(w, ai.id, human.id, t2, g2, '', { counterOf: d.id, expires: w.day + 10 });
    d.reply = `${name}: So nicht. Unser Gegenvorschlag liegt in Ihrem Eingang.`;
    d.counterId = c.id;
    human.log(w.day, `${name} macht ein Gegenangebot: ${dealText(w, c)}`, 'deal');
  }
  /** Monatlich: KI-Airlines treten mit eigenen Vorschlägen an Menschen heran. */
  function aiDealOffers(w) {
    const r = w.rng;
    for (const h of w.humans) {
      if (h.status === 'insolvent' || r.random() > 0.45) continue;
      if (w.deals.some((d) => d.status === 'open' && d.to === h.id && !w.airlines[d.from].isPlayer)) continue;
      const ais = w.list.filter((a) => a.archetype && a.status === 'active');
      const ideas = [];
      // a) Konkurrenz zahlt für Ihren Rückzug
      for (const hr of h.activeRoutes()) {
        if (w.day - hr.opened_day < 45) continue;
        const pair = pairKey(hr.base, hr.dest);
        for (const ai of ais) if (pairRoute(ai, pair)) {
          const amt = Math.floor(exitGain(w, ai, h, pair, 365) * 0.55 / 5000) * 5000;
          if (amt >= 50000 && ai.ledger.cash / 100 > amt * 3 + 5e6) ideas.push(() => newDeal(w, ai.id, h.id, [{ k: 'cash', amount: amt }], [{ k: 'exit', pair, days: 365, withSlots: false }], `Wir würden ${hr.base}–${hr.dest} gern allein bedienen.`));
        }
      }
      // b) KI kauft ungenutzte Flugzeuge
      for (const a of h.fleet) {
        if (a.delivery_day > w.day || a.idle_days < 20 || (a.acmi && a.acmi.end > w.day)) continue;
        const ai = ais.find((x) => (x.cfg.pref_types || []).includes(a.type_id) && x.fleet.length < x.maxFleet);
        const amt = Math.floor(Math.max(0, acDealValue(w, a)) * 0.95 / 5000) * 5000;
        if (ai && amt > 0 && ai.ledger.cash / 100 > amt + 5e6) ideas.push(() => newDeal(w, ai.id, h.id, [{ k: 'cash', amount: amt }], [{ k: 'ac', id: a.id }], 'Ihr Flugzeug steht nur herum. Wir hätten Verwendung dafür.'));
      }
      // c) KI verkauft Slot-Reserven an Ihren Flughäfen
      const mine = new Set([...h.bases, ...h.activeRoutes().flatMap((x) => [x.base, x.dest])]);
      for (const ai of ais) for (const apt of Object.keys(ai.slotHold || {})) {
        const n = Math.min(2, ai.heldAt(apt, w.day));
        if (n > 0 && mine.has(apt)) ideas.push(() => newDeal(w, ai.id, h.id, [{ k: 'slots', apt, n }], [{ k: 'cash', amount: roundTo(slotValue(w, apt) * n * 1.15, 5000) }], `Wir geben Slots in ${apt} ab.`));
      }
      // d) KI bietet eigenen Rückzug gegen Ablöse an, wenn sie dort Geld verliert
      for (const hr of h.activeRoutes()) {
        const pair = pairKey(hr.base, hr.dest);
        for (const ai of ais) { const rr = pairRoute(ai, pair); if (rr && rr.hist.length >= 30 && routeDb(rr, 30, ai) < 0) ideas.push(() => newDeal(w, ai.id, h.id, [{ k: 'exit', pair, days: 365, withSlots: coordinated(rr.base) || coordinated(rr.dest) }], [{ k: 'cash', amount: roundTo(exitLoss(w, ai, pair, 365) * 0.9, 5000) }], `Wir ziehen uns von ${rr.base}–${rr.dest} zurück – gegen eine Ablöse.`)); }
      }
      // f) Premium-Airlines schlagen Codeshare auf gemeinsamen Strecken vor
      for (const hr of h.activeRoutes()) {
        const pair = pairKey(hr.base, hr.dest);
        for (const ai of ais) if (ai.archetype === 'premium' && pairRoute(ai, pair) && !(w.coops || []).some((c) => c.pair === pair && (c.a === h.id || c.b === h.id))) ideas.push(() => newDeal(w, ai.id, h.id, [{ k: 'coop', kind: 'codeshare', pair, days: 365 }], [], `Gemeinsam sind wir auf ${hr.base}–${hr.dest} stärker als die Low-Cost-Konkurrenz.`));
      }
      // e) Crews gegen Ablöse, wenn Sie Agenturpersonal brauchen
      if (h.staff && h.staff.cov && h.staff.cov.agencyH > 0) {
        const g = STAFF_GROUPS.find((x) => h.fleet.some((a) => P.AIRCRAFT_TYPES[a.type_id].group === x));
        const ai = ais.find((x) => x.fleet.some((a) => P.AIRCRAFT_TYPES[a.type_id].group === g));
        if (g && ai) ideas.push(() => newDeal(w, ai.id, h.id, [{ k: 'staff', role: 'pilot', group: g, n: 4 }], [{ k: 'cash', amount: roundTo(4 * staffUnitCost('pilot', g) * 1.6 * w.macro.cpi, 5000) }], 'Wir haben Piloten übrig, die sofort bei Ihnen anfangen können.'));
      }
      if (!ideas.length) continue;
      const d = ideas[Math.floor(r.random() * ideas.length)]();
      d.expires = w.day + 20;
      h.log(w.day, `Neues Angebot von ${w.airlines[d.from].name}: ${dealText(w, d)}`, 'deal');
    }
  }
  function expireDeals(w) {
    for (const d of w.deals) if (d.status === 'open' && d.expires <= w.day) {
      d.status = 'expired'; d.resolvedDay = w.day;
      const A = w.airlines[d.from]; if (A && A.isPlayer) A.log(w.day, d.to === MARKET ? 'Ihr Marktgesuch ist abgelaufen' : `Angebot an ${w.airlines[d.to].name} ist abgelaufen`, 'info');
      if (d.to === MARKET) for (const x of w.deals) if (x.marketOf === d.id && x.status === 'open') { x.status = 'withdrawn'; x.resolvedDay = w.day; }
    }
    // Neue KI-Antworten auf Marktgesuche (alle drei Tage)
    if (w.day % 3 === 0) for (const d of w.deals) if (d.status === 'open' && d.to === MARKET && w.day - d.day <= 12) marketAiResponses(w, d, 1);
  }
  /** KI-Airlines prüfen ein Marktgesuch und schicken passende Angebote (zu den Bedingungen oder mit Aufschlag). */
  function marketAiResponses(w, d, maxNew = 3) {
    const poster = w.airlines[d.from]; if (!poster) return 0;
    const answered = new Set(w.deals.filter((x) => x.marketOf === d.id).map((x) => x.from));
    const cands = [];
    for (const ai of w.list.filter((a) => a.archetype && a.status === 'active' && !answered.has(a.id))) {
      const give = resolveItems(w, ai, d.take); if (!give) continue;               // KI liefert, was gesucht wird
      if (checkSide(w, ai, poster, give)) continue;
      const c = { from: ai.id, to: poster.id, give, take: d.give.map((x) => ({ ...x })) };
      if (!c.give.length && !c.take.length) continue;
      const selling = d.give.some((y) => y.k !== 'cash');                         // Anzeige verkauft etwas
      const ask = d.take.filter((y) => y.k === 'cash').reduce((a, y) => a + y.amount, 0);
      if (selling && !ask) {                                                       // „Angebote erbeten“: KI bietet selbst
        const ev0 = aiDealValue(w, ai, c); if (ev0.why.length) continue;
        const bid = Math.floor((ev0.vin - ev0.vout - ev0.margin) * w.rng.range(0.78, 0.95) / 5000) * 5000;
        if (bid >= 10000) { c.give.push({ k: 'cash', amount: bid }); if (!aiDealValue(w, ai, c).why.length) cands.push({ ai, c, extra: 0, score: bid }); }
        continue;
      }
      const ev = aiDealValue(w, ai, c);
      if (ev.why.length) continue;
      const vol = ev.vin + ev.vout + 1;
      if (ev.value >= 0) cands.push({ ai, c, extra: 0, score: ev.value / vol });
      else if (selling ? ev.need <= 0.4 * ask : (!d.give.length || ev.need < 0.35 * vol + 50000)) cands.push({ ai, c, extra: roundTo(ev.need * w.rng.range(1.02, 1.3), 5000), score: -ev.need / vol });
    }
    cands.sort((a, b) => b.score - a.score);
    let n = 0;
    for (const x of cands.slice(0, maxNew)) {
      const { ai, c, extra } = x;
      const selling = d.give.some((y) => y.k !== 'cash');
      if (extra > 0) {
        const posterPays = c.take.find((y) => y.k === 'cash'), aiPays = c.give.find((y) => y.k === 'cash');
        let need = extra;
        if (aiPays) { const cut = Math.min(aiPays.amount, need); aiPays.amount -= cut; need -= cut; }
        if (need > 0 && selling) continue;                                         // Verkäufer zahlt nie drauf
        if (need > 0) { if (posterPays) posterPays.amount += need; else c.take.push({ k: 'cash', amount: need }); }
        c.give = c.give.filter((y) => y.k !== 'cash' || y.amount > 0); c.take = c.take.filter((y) => y.k !== 'cash' || y.amount > 0);
      }
      const note = extra > 0 ? (selling ? 'Auf Ihre Marktanzeige – etwas unter Ihrem Preis.' : 'Auf Ihre Marktanzeige – mit kleinem Aufschlag.') : 'Auf Ihre Marktanzeige – zu Ihren Bedingungen.';
      const r = newDeal(w, ai.id, poster.id, c.give, c.take, note, { marketOf: d.id, expires: Math.min(d.expires + 3, w.day + 10) });
      poster.log(w.day, `${ai.name} antwortet auf Ihr Marktgesuch: ${dealText(w, r)}`, 'deal');
      n++;
    }
    return n;
  }
  /** Gesuch geschlossen: offene Antworten darauf zurückziehen. */
  function closeMarket(w, mid, status = 'accepted') {
    const m = w.deals.find((x) => x.id === mid); if (!m || m.status !== 'open') return;
    m.status = status; m.resolvedDay = w.day;
    for (const x of w.deals) if (x.marketOf === mid && x.status === 'open') { x.status = 'withdrawn'; x.resolvedDay = w.day; }
  }
  function dealAction(w, al, a) {
    const day = w.day;
    if (a.type === 'dealPropose' && a.to === MARKET) {
      const give = cleanItems(a.give), take = cleanItems(a.take);
      if (!give.length && !take.length) return { ok: false, msg: 'Das Gesuch ist leer.' };
      if (give.some((x) => x.k === 'acAny' || x.k === 'exit' || x.k === 'coop') || take.some((x) => x.k === 'exit' || x.k === 'coop' || x.k === 'ac'))
        return { ok: false, msg: 'Am Markt geht es um Geld, Flugzeuge, Personal und Slots. Rückzüge und Kooperationen verhandeln Sie direkt mit einer Airline.' };
      if (w.deals.filter((d) => d.status === 'open' && d.from === al.id && d.to === MARKET).length >= 4) return { ok: false, msg: 'Höchstens vier offene Marktanzeigen gleichzeitig.' };
      const sells = give.some((x) => x.k !== 'cash'), buys = take.some((x) => x.k !== 'cash');
      if (!sells && !buys) return { ok: false, msg: 'Eine Anzeige braucht etwas, das Sie anbieten oder suchen – nicht nur Geld.' };
      if (sells && buys) return { ok: false, msg: 'Bitte entweder anbieten (gegen Geld) oder suchen (gegen Geld) – Tausch verhandeln Sie direkt mit einer Airline.' };
      const err = checkSide(w, al, null, give); if (err) return { ok: false, msg: err };
      const d = newDeal(w, al.id, MARKET, give, take, a.note, { market: true, expires: day + 21 });
      const n = marketAiResponses(w, d, 3);
      w.pushNews(day, `Marktplatz: ${al.name} ${take.length ? 'sucht' : 'bietet'} ${(take.length ? take : give).map((x) => itemText(w, x, al)).join(', ')}`, 'trade', al.id);
      for (const h of w.humans) if (h.id !== al.id) h.log(day, `Neues Marktgesuch von ${al.name}: ${dealText(w, d)}`, 'deal');
      return { ok: true, id: d.id, status: 'open', reply: n ? `${n} ${n === 1 ? 'Airline hat' : 'Airlines haben'} schon geantwortet – die Angebote liegen in Ihrem Eingang.` : 'Noch keine Antwort. KI-Airlines prüfen das Gesuch in den nächsten Tagen.' };
    }
    if (a.type === 'marketAccept') {
      const m = w.deals.find((x) => x.id === a.id && x.to === MARKET);
      if (!m || m.status !== 'open') return { ok: false, msg: 'Dieses Marktgesuch ist nicht mehr offen.' };
      if (m.from === al.id) return { ok: false, msg: 'Das ist Ihre eigene Anzeige.' };
      if (m.give.some((x) => x.k !== 'cash') && !m.take.length) return { ok: false, msg: 'Hier ist kein Preis genannt – machen Sie ein Angebot.' };
      if (m.take.some((x) => x.k !== 'cash') && !m.give.length) return { ok: false, msg: 'Hier ist kein Preis genannt – machen Sie ein Angebot.' };
      const give = resolveItems(w, al, m.take, Array.isArray(a.acIds) && a.acIds.length ? a.acIds.map(String) : null);
      if (!give) return { ok: false, msg: 'Sie haben kein passendes Flugzeug frei.' };
      const d = newDeal(w, al.id, m.from, give, m.give.map((x) => ({ ...x })), '', { marketOf: m.id });
      const res = executeDeal(w, d);
      if (!res.ok) { d.status = 'failed'; d.resolvedDay = day; return res; }
      closeMarket(w, m.id);
      const P0 = w.airlines[m.from]; if (P0 && P0.isPlayer) P0.log(day, `${al.name} hat Ihr Marktgesuch angenommen: ${dealText(w, d)}`, 'good');
      return res;
    }
    if (a.type === 'dealPropose') {
      const to = w.airlines[a.to];
      if (!to || to.id === al.id) return { ok: false, msg: 'Ungültiger Handelspartner.' };
      if (to.status === 'insolvent') return { ok: false, msg: `${to.name} ist insolvent.` };
      const give = cleanItems(a.give).filter((x) => x.k !== 'acAny'), take = cleanItems(a.take).filter((x) => x.k !== 'acAny');
      if (!give.length && !take.length) return { ok: false, msg: 'Das Angebot ist leer.' };
      if (give.some((x) => x.k === 'exit') && take.some((x) => x.k === 'exit' && give.some((y) => y.k === 'exit' && y.pair === x.pair))) return { ok: false, msg: 'Beide Seiten können nicht von derselben Strecke zurücktreten.' };
      if (w.deals.filter((d) => d.status === 'open' && d.from === al.id).length >= DEAL_MAX_OPEN) return { ok: false, msg: `Höchstens ${DEAL_MAX_OPEN} offene Angebote gleichzeitig.` };
      const err = checkSide(w, al, to, give); if (err) return { ok: false, msg: err };
      let orig = null;
      if (a.replyTo) {
        orig = w.deals.find((d) => d.id === a.replyTo && d.status === 'open' && d.to === al.id);
        if (!orig) return { ok: false, msg: 'Auf dieses Angebot kann nicht mehr geantwortet werden.' };
        if (orig.from !== to.id) return { ok: false, msg: 'Gegenangebote gehen an den ursprünglichen Absender.' };
      }
      if (to.isPlayer) { const e2 = checkSide(w, to, al, take); if (e2) return { ok: false, msg: e2 }; }
      const mk = typeof a.marketOf === 'string' ? w.deals.find((x) => x.id === a.marketOf && x.to === MARKET && x.status === 'open' && x.from === to.id) : null;
      const d = newDeal(w, al.id, to.id, give, take, a.note, { ...(orig ? { counterOf: orig.id } : {}), ...(mk ? { marketOf: mk.id } : {}) });
      if (orig) { orig.status = 'countered'; orig.resolvedDay = day; orig.counterId = d.id; }
      if (to.isPlayer) { to.log(day, `${orig ? 'Gegenangebot' : 'Neues Angebot'} von ${al.name}: ${dealText(w, d)}`, 'deal'); al.log(day, `Angebot an ${to.name} gesendet`, 'info'); return { ok: true, id: d.id, status: 'open' }; }
      aiRespond(w, to, d);
      return { ok: true, id: d.id, status: d.status, reply: d.reply, counterId: d.counterId || null };
    }
    const d = w.deals.find((x) => x.id === a.id);
    if (!d) return { ok: false, msg: 'Angebot nicht gefunden.' };
    if (d.status !== 'open') return { ok: false, msg: 'Das Angebot ist nicht mehr offen.' };
    if (a.type === 'dealWithdraw') {
      if (d.from !== al.id) return { ok: false, msg: 'Nur der Absender kann zurückziehen.' };
      if (d.to === MARKET) { closeMarket(w, d.id, 'withdrawn'); return { ok: true }; }
      d.status = 'withdrawn'; d.resolvedDay = day;
      const B = w.airlines[d.to]; if (B.isPlayer) B.log(day, `${al.name} hat ein Angebot zurückgezogen`, 'info');
      return { ok: true };
    }
    if (a.type === 'dealRespond') {
      if (d.to !== al.id) return { ok: false, msg: 'Dieses Angebot richtet sich nicht an Sie.' };
      const A = w.airlines[d.from];
      if (a.choice === 'reject') {
        d.status = 'rejected'; d.resolvedDay = day;
        if (A.isPlayer) A.log(day, `${al.name} hat Ihr Angebot abgelehnt`, 'warn');
        return { ok: true };
      }
      if (a.choice !== 'accept') return { ok: false, msg: 'Ungültig.' };
      if (!A.isPlayer) { const ev = aiDealValue(w, A, d); if (ev.why.length) { d.status = 'failed'; d.resolvedDay = day; return { ok: false, msg: `${A.name} kann das Angebot nicht mehr erfüllen.` }; } }
      const res = executeDeal(w, d);
      if (!res.ok) { d.status = 'failed'; d.resolvedDay = day; if (A.isPlayer) A.log(day, `Handel mit ${al.name} gescheitert: ${res.msg}`, 'warn'); }
      else if (d.marketOf) closeMarket(w, d.marketOf);
      return res;
    }
    return { ok: false, msg: 'Unbekannte Aktion.' };
  }

  // ===========================================================================
  // Spieleraktionen: Prüfung und Ausführung an einer Stelle (lokal und auf dem Server)
  // ===========================================================================
  function acquireCost(al, typeId, mode, offer = null, eurusd = P.EURUSD, w = null) {
    const t = P.AIRCRAFT_TYPES[typeId], intro = al.familyKnown(typeId) ? 0 : P.TYPE_INTRO_COST, duty = 1 + acTariff(w, al, typeId);
    const oldF = al.oldAcFactor ? al.oldAcFactor(offer ? offer.age : t.age) : 1, rk = riskTerms(al, typeId);
    if (mode === 'buy') return (offer ? offer.price : t.value_eur) * duty * oldF * rk.down + intro;
    if (mode === 'factory') return t.value_eur * 1.08 * duty * rk.down + intro;
    if (mode === 'flex') return intro;
    return rk.dep * (offer ? offer.lease_month : t.lease_month) * rk.lease * duty * oldF * (P.EURUSD / eurusd) + intro;
  }
  function staffPlanOf(al, horizon, day) {
    const need = al.staffNeedPlanned(horizon, day), st = al.staff;
    const pipe = (role, g) => st.pipeline.filter((p) => (p.kind === 'hire' && p.role === role && (role !== 'pilot' || p.group === g)) || (p.kind === 'train' && role === 'pilot' && p.to === g)).reduce((s, p) => s + p.count, 0);
    const rows = STAFF_GROUPS.map((g) => ({ key: g, role: 'pilot', group: g, label: roleLabel('pilot', g), have: st.pil[g], need: need.pil[g], pipe: pipe('pilot', g), salary: P.STAFF.pilotSalary[g] }))
      .filter((r) => r.have || r.need || r.pipe || al.fleet.some((a) => P.AIRCRAFT_TYPES[a.type_id].group === r.group));
    rows.push({ key: 'cab', role: 'cabin', group: null, label: 'Flugbegleiterinnen', have: st.cab, need: need.cab, pipe: pipe('cabin'), salary: P.STAFF.cabinSalary });
    rows.push({ key: 'tech', role: 'tech', group: null, label: 'Techniker', have: st.tech, need: need.tech, pipe: pipe('tech'), salary: P.STAFF.techSalary });
    return rows;
  }
  const num = (x, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
  const LOGO_SHAPES = ['circle', 'square', 'shield', 'hex', 'diamond', 'tail', 'none'];
  const LOGO_SYMBOLS = ['paper', 'jet', 'eagle', 'star', 'globe', 'wing', 'crown', 'wave', 'sun', 'mountain', 'leaf', 'arrow', 'compass', 'bolt', 'code'];
  /** Gleiches Logo (Form, Symbol, beide Farben) darf in einer Welt nur eine aktive Airline tragen. Beim Symbol „Kürzel“ zählt das Kürzel mit. */
  function logoTaken(w, al, L) {
    const key = (x, code) => x && [x.shape, x.sym, String(x.c1).toLowerCase(), String(x.c2).toLowerCase(), x.sym === 'code' ? code : ''].join('|');
    const k = key(L, al.code);
    return w.list.find((o) => o !== al && o.status !== 'insolvent' && o.logo && key(o.logo, o.code) === k) || null;
  }
  /** Feste Zuweisung eines Flugzeugs zu Strecken, mit allen Grenzen: Basis, Typ, Betriebsfenster, Frequenz. */
  function assignAircraft(w, al, a) {
    const ac = al.fleet.find((x) => x.id === a.acId);
    if (!ac) return { ok: false, msg: 'Flugzeug nicht gefunden.' };
    const mode = ['auto', 'manual', 'reserve'].includes(a.mode) ? a.mode : 'auto';
    const label = ac.id.replace(al.id + '-', (al.code || 'SM') + '-');
    if (mode !== 'manual') {
      ac.mode = mode; ac.pins = [];
      al.log(w.day, `${label}: ${mode === 'auto' ? 'automatische Einsatzplanung' : 'als Reserve vorgehalten'}`, 'fleet');
      w.operableFreq(al);
      return { ok: true };
    }
    const win = winOf(ac.type_id), pins = [];
    let hours = 0, hasLong = false;
    for (const p of (Array.isArray(a.pins) ? a.pins : []).slice(0, 12)) {
      const r = al.routes.find((x) => x.id === p.route && !x.closed), n = clamp(Math.round(num(p.n)), 0, 8);
      if (!r || n <= 0) continue;
      if (pins.some((x) => x.route === r.id)) continue;
      const tag = `${r.base}–${r.dest}`;
      if (r.base !== ac.base) return { ok: false, msg: `${label} ist in ${ac.base} stationiert, ${tag} startet in ${r.base}. Erst umstationieren.` };
      if (r.type_id !== ac.type_id) return { ok: false, msg: `${tag} wird mit ${P.AIRCRAFT_TYPES[r.type_id].label} geflogen. Strecke erst auf ${P.AIRCRAFT_TYPES[ac.type_id].label} umstellen.` };
      const h = al.rotH(r);
      if (h > win) { hasLong = true; pins.push({ route: r.id, n: 1 }); continue; }
      if (n > r.freq) return { ok: false, msg: `${tag} hat nur ${r.freq} ${r.freq === 1 ? 'Umlauf' : 'Umläufe'} am Tag.` };
      const taken = al.fleet.filter((x) => x !== ac && x.mode === 'manual').reduce((s, x) => s + (x.pins || []).filter((q) => q.route === r.id).reduce((t, q) => t + q.n, 0), 0);
      if (taken + n > r.freq) return { ok: false, msg: `Auf ${tag} sind schon ${taken} von ${r.freq} Umläufen fest vergeben.` };
      hours += n * h; pins.push({ route: r.id, n });
    }
    if (hasLong && pins.length > 1) return { ok: false, msg: 'Ein Langstreckenumlauf belegt das Flugzeug ganz. Bitte nur diese eine Strecke zuweisen.' };
    if (hours > win + 1e-9) return { ok: false, msg: `Das sind ${Math.round(hours * 10) / 10} Stunden, das Betriebsfenster hat ${win} Stunden.` };
    ac.mode = 'manual'; ac.pins = pins;
    al.log(w.day, `${label}: feste Zuweisung ${pins.map((p) => { const r = al.routes.find((x) => x.id === p.route); return `${r.base}–${r.dest} ${p.n}x`; }).join(', ') || '(keine Strecke)'}`, 'fleet');
    w.operableFreq(al);
    const { unplaced } = al.plan(w.day);
    const miss = Object.entries(unplaced).map(([rid, k]) => { const r = al.routes.find((x) => x.id === rid); return r ? `${r.base}–${r.dest} (${k})` : null; }).filter(Boolean);
    return { ok: true, msg: miss.length ? `Gespeichert. Ohne Flugzeug bleiben: ${miss.join(', ')}.` : 'Einsatzplan gespeichert.' };
  }
  // Eingaben von außen bereinigen: keine Prototyp-Schlüssel ('__proto__', 'constructor' …), keine NaN/Infinity
  const PROTO_KEYS = new Set(Object.getOwnPropertyNames(Object.prototype));
  function cleanInput(v, depth = 0) {
    if (typeof v === 'string') return PROTO_KEYS.has(v) ? undefined : v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (Array.isArray(v)) return depth > 5 ? [] : v.slice(0, 500).map((x) => cleanInput(x, depth + 1));
    if (v && typeof v === 'object') {
      if (depth > 5) return undefined;
      const o = {};
      for (const k of Object.keys(v)) if (!PROTO_KEYS.has(k)) o[k] = cleanInput(v[k], depth + 1);
      return o;
    }
    return v;
  }
  const STAFF_ROLES = ['pilot', 'cabin', 'tech'];
  function applyAction(w, alId, a) {
    a = cleanInput(a);
    const al = w.airlines[alId];
    if (!al || !al.isPlayer) return { ok: false, msg: 'Airline nicht gefunden.' };
    if (al.status === 'insolvent') return { ok: false, msg: 'Die Airline ist insolvent.' };
    if (!a || typeof a.type !== 'string') return { ok: false, msg: 'Unbekannte Aktion.' };
    const day = w.day, cash = al.ledger.cash / 100, cpiV = w.macro.cpi;
    const route = (id) => al.routes.find((r) => r.id === id && !r.closed);
    const ac = (id) => al.fleet.find((x) => x.id === id);
    switch (a.type) {
      case 'openRoute': {
        const { base, dest } = a, type = a.typeId, wk = a.wk !== undefined && a.wk !== null ? clamp(Math.round(num(a.wk, 7)), 1, 7) : 7, freq = wk < 7 ? 1 : clamp(Math.round(num(a.freq, 1)), 1, 8);
        if (!al.bases.includes(base) || !P.AIRPORTS[dest] || !P.AIRCRAFT_TYPES[type] || base === dest) return { ok: false, msg: 'Ungültige Strecke.' };
        if (!routeKmOk(base, dest)) return { ok: false, msg: 'Unter 300 km lohnt kein Flug.' };
        if (!aptOk(base, dest, type)) return { ok: false, msg: aptWhy(base, dest, type) };
        if (!rangeOk(base, dest, type)) return { ok: false, msg: 'Reichweite zu kurz.' };
        if (al.activeRoutes().some((r) => pairKey(r.base, r.dest) === pairKey(base, dest))) return { ok: false, msg: `${base}–${dest} fliegen Sie schon. Ändern Sie die Frequenz in der Streckenliste.` };
        if (barred(w, al.id, base, dest)) { const g = w.agreements.find((x) => x.airline === al.id && x.pair === pairKey(base, dest) && x.until > day); return { ok: false, msg: `Sie haben vertraglich zugesagt, ${base}–${dest} bis Tag ${g.until + 1} nicht zu fliegen.` }; }
        if (!w.slotsOkFor(al, base, dest, freq)) { const bad = [base, dest].filter((x) => w.slotsFreeFor(al, x) < freq).map((x) => `${x}: ${Math.max(0, w.slotsFreeFor(al, x))} frei${al.heldAt(x, day) ? ` (davon ${al.heldAt(x, day)} aus Ihrer Reserve)` : ''}`); return { ok: false, msg: `Nicht genug Slots für ${freq} Flüge täglich – ${bad.join(', ')}.` }; }
        const service = P.SERVICE[a.service] ? a.service : 'standard', buffer = P.BUFFER_POLICY[a.buffer] ? a.buffer : 'normal';
        const fo = clamp(num(a.fo, refPrice(base, dest, cpiV)), 10, 5000), fi = clamp(num(a.fi, refPrice(dest, base, cpiV)), 10, 5000);
        const sc = w.slotCost(al, base, dest, freq), lic = al.isPlayer && !al.stations[dest] ? licenceFee(w, dest) : 0;
        if (sc.cost + lic > 0 && al.spendable(w.macro.bank ?? 1) < sc.cost + lic) return { ok: false, msg: `Die Slots kosten ${Math.round(sc.cost / 1000)} Tsd. EUR (${sc.parts.map((x) => `${x.apt}: ${x.n}`).join(', ')})${lic ? `, die Betriebslizenz für ${dest} ${Math.round(lic / 1000)} Tsd. EUR` : ''} – dafür reicht auch der Dispo nicht.` };
        if (lic) { al.ledger.post('one_off', -lic); al.log(day, `Betriebslizenz ${ap(dest).name}: ${Math.round(lic / 1000)} Tsd. EUR`, 'route'); }
        if (sc.cost > 0) { for (const x of sc.parts) al.slotInvest(x.apt, x.cost, x.n); al.log(day, `Slots für ${base}–${dest} gekauft: ${sc.parts.map((x) => `${x.n} in ${x.apt}`).join(', ')} (${Math.round(sc.cost / 1000)} Tsd. EUR)`, 'route'); }
        if (!al.stations[dest] && P.TERMINALS[a.term]) al.station(dest).terminal = a.term;
        const rot = rotationHours(base, dest, type, service, buffer, al.turnExtra(base), al.turnExtra(dest));
        const { used } = al.plan(day, null, 0), wnd = winOf(type);
        const now = al.fleet.some((x) => x.type_id === type && x.base === base && al.available(x, day, 0) && (rot > wnd ? (used[x.id] || 0) === 0 : wnd - (used[x.id] || 0) >= rot));
        const soon = al.fleet.filter((x) => x.type_id === type && x.base === base && x.delivery_day > day).map((x) => x.delivery_day).sort((x, y) => x - y);
        const start = now ? day + 1 : (soon.length ? soon[0] : day + 1);
        const r = al.openRoute(start, base, dest, type, freq, fo, fi, service, buffer, 0.85, false);
        if (wk < 7) r.wk = wk;
        if (['feeder', 'local'].includes(a.role)) r.role = a.role;
        w.takeSlots(al, base, dest, freq);
        if (w.humans.length > 1) w.pushNews(day, `${al.name} kündigt ${ap(base).name}–${ap(dest).name} an: ${freq}x täglich, ab ${Math.round(Math.min(fo, fi))} EUR`, 'ai', al.id);
        w.operableFreq(al);
        return { ok: true, id: r.id, start };
      }
      case 'editRoute': {
        const r = route(a.id); if (!r) return { ok: false, msg: 'Strecke nicht gefunden.' };
        const out = { ok: true };
        if (a.typeId && a.typeId !== r.type_id) {
          const nt = a.typeId;
          if (!P.AIRCRAFT_TYPES[nt]) return { ok: false, msg: 'Unbekannter Flugzeugtyp.' };
          if (!aptOk(r.base, r.dest, nt)) return { ok: false, msg: aptWhy(r.base, r.dest, nt) };
          if (!rangeOk(r.base, r.dest, nt)) return { ok: false, msg: `Die ${P.AIRCRAFT_TYPES[nt].label} schafft ${r.base}–${r.dest} nicht.` };
          if (!al.fleet.some((x) => x.type_id === nt && x.base === r.base)) return { ok: false, msg: `In ${r.base} ist keine ${P.AIRCRAFT_TYPES[nt].label} stationiert.` };
          const was = r.type_id; r.type_id = nt;
          for (const x of al.fleet) if (x.pins && x.type_id !== nt) x.pins = x.pins.filter((p) => p.route !== r.id);
          al.log(day, `${r.base}–${r.dest}: Umflottung ${P.AIRCRAFT_TYPES[was].label} → ${P.AIRCRAFT_TYPES[nt].label}`, 'route');
          out.msg = `${r.base}–${r.dest} fliegt jetzt mit ${P.AIRCRAFT_TYPES[nt].label} (${r.seats()} Sitze).`;
        }
        const fo = num(a.fo, r.fare_out), fi = num(a.fi, r.fare_in);
        if (fo > 0 && fi > 0 && (Math.round(fo) !== Math.round(r.fare_out) || Math.round(fi) !== Math.round(r.fare_in))) r.setFares(day, clamp(fo, 10, 5000), clamp(fi, 10, 5000));
        const nwk = a.wk !== undefined && a.wk !== null ? clamp(Math.round(num(a.wk, 7)), 1, 7) : (r.wk || 7);
        const nf = nwk < 7 ? 1 : clamp(Math.round(num(a.freq, r.freq)), 1, 8), ns = P.SERVICE[a.service] ? a.service : r.service, nb = P.BUFFER_POLICY[a.buffer] ? a.buffer : r.buffer;
        if (nwk !== (r.wk || 7)) { const was = r.wk || 7; if (nwk < 7) r.wk = nwk; else delete r.wk; al.log(day, `${r.base}–${r.dest}: ${was < 7 ? was + 'x pro Woche' : r.freq + 'x täglich'} → ${nwk < 7 ? nwk + 'x pro Woche' : nf + 'x täglich'}`, 'route'); }
        if (a.role !== undefined) { if (['feeder', 'local'].includes(a.role)) r.role = a.role; else delete r.role; }
        if (nf > r.freq && !w.slotsOkFor(al, r.base, r.dest, nf - r.freq)) out.msg = `Keine freien Slots für ${nf - r.freq} weitere Flüge. Frequenz bleibt bei ${r.freq}.`;
        else if (nf > r.freq && w.slotCost(al, r.base, r.dest, nf - r.freq).cost > al.spendable(w.macro.bank ?? 1)) out.msg = `Die zusätzlichen Slots kosten ${Math.round(w.slotCost(al, r.base, r.dest, nf - r.freq).cost / 1000)} Tsd. EUR – dafür reicht das Geld nicht. Frequenz bleibt bei ${r.freq}.`;
        else if (nf !== r.freq || ns !== r.service || nb !== r.buffer) {
          const old = [r.freq, r.service, r.buffer];
          if (nf > old[0]) { const sc = w.slotCost(al, r.base, r.dest, nf - old[0]); if (sc.cost > 0) { for (const x of sc.parts) al.slotInvest(x.apt, x.cost, x.n); al.log(day, `Slots für ${r.base}–${r.dest} gekauft: ${sc.parts.map((x) => `${x.n} in ${x.apt}`).join(', ')} (${Math.round(sc.cost / 1000)} Tsd. EUR)`, 'route'); } }
          r.freq = nf; r.service = ns; r.buffer = nb;
          if (nf > old[0]) w.takeSlots(al, r.base, r.dest, nf - old[0]);
          else if (nf < old[0]) for (const x of [r.base, r.dest]) al.release(x, old[0] - nf, day);
          const { unplaced } = al.plan(day, null, P.LEASE_DELIVERY_DAYS);
          if (unplaced[r.id]) out.msg = `Nicht genug Flugzeugzeit: ${unplaced[r.id]} Umlauf/Umläufe fliegen erst mit einem weiteren Flugzeug vom Typ ${P.AIRCRAFT_TYPES[r.type_id].label}.`;
          al.log(day, `${r.base}–${r.dest}: ${old[0]}x ${P.SERVICE[old[1]].label} ${P.BUFFER_POLICY[old[2]].label} → ${nf}x ${P.SERVICE[ns].label} ${P.BUFFER_POLICY[nb].label}`, 'route');
        }
        r.autoPrice = false;
        w.operableFreq(al);
        return out;
      }
      case 'closeRoute': { const r = route(a.id); if (!r) return { ok: false, msg: 'Strecke nicht gefunden.' }; al.closeRoute(day, r, 'von Ihnen eingestellt'); w.operableFreq(al); return { ok: true }; }
      case 'acquire': {
        const offer = a.offerId ? w.acMarket.find((o) => o.id === a.offerId) : null;
        if (a.offerId && !offer) return { ok: false, msg: 'Das Angebot ist nicht mehr verfügbar.' };
        const type = offer ? offer.type : a.typeId, mode = offer ? (offer.kind === 'lease' ? 'lease' : 'buy') : a.mode;
        if (!P.AIRCRAFT_TYPES[type] || !['lease', 'flex', 'buy', 'factory'].includes(mode)) return { ok: false, msg: 'Ungültiges Flugzeug.' };
        if (careerAcqLeft(w, al) <= 0) { const L = careerOf(al), next = Math.min(...al.prog.acq.filter((d) => d > day - 30)) + 30; return { ok: false, msg: `In Phase ${careerLv(al) + 1} „${L.label}“ kommen höchstens ${L.acq} neue Flugzeuge je 30 Tage dazu. Das nächste geht ab Tag ${next + 1}.` }; }
        { const t = P.AIRCRAFT_TYPES[type]; if (!offer && t.launch && day < t.launch + 365) return { ok: false, msg: day < t.launch - 30 ? `${t.label} ist noch nicht auf dem Markt.` : `${t.label} gibt es im ersten Jahr nur über Auktionen (Flotte → Beschaffung).` }; }
        { const t = P.AIRCRAFT_TYPES[type];
          if (mode === 'factory' && t.noFactory) return { ok: false, msg: `${t.label} wird nicht mehr gebaut – nur Leasing oder Gebrauchtmarkt.` };
          if (t.maxPerAirline && al.fleet.filter((x) => x.type_id === type).length >= t.maxPerAirline) return { ok: false, msg: `Höchstens ${t.maxPerAirline} × ${t.label} je Airline.` };
          if (!offer && t.stock === 0) return { ok: false, msg: `${t.label} gibt es nur gebraucht – Flotte → Beschaffung → Gebrauchtmarkt.` }; }
        const base = al.bases.includes(a.base) ? a.base : al.bases[0];
        if (al.spendable(w.macro.bank ?? 1) < acquireCost(al, type, mode, offer, w.macro.eurusd, w)) return { ok: false, msg: 'Dafür reicht auch der Dispo nicht.' };
        const x = offer ? w.takeMarketAircraft(al, offer.id, mode, base).ac : al.acquire(day, type, base, mode, null, w);
        if (x) careerNoteAcq(w, al);
        if (!x) return { ok: false, msg: `Beim Leasinggeber ist gerade keine ${P.AIRCRAFT_TYPES[type].label} verfügbar – andere Airlines haben den Bestand leer gekauft. Gebrauchtmarkt, Auktion, Werksbestellung oder nächsten Monat erneut versuchen.` };
        return { ok: true, acId: x.id, delivery: x.delivery_day, base };
      }
      case 'dispose': { const x = ac(a.acId); if (!x) return { ok: false, msg: 'Flugzeug nicht gefunden.' }; al.dispose(day, x, 'von Ihnen'); w.operableFreq(al); return { ok: true }; }
      case 'acmi': return w.acceptAcmi(al, a.offerId, a.acId);
      case 'move': { const r = w.moveAircraft(al, a.acId, a.base); if (r.ok) w.operableFreq(al); return r; }
      case 'hire': case 'fire': {
        if (!STAFF_ROLES.includes(a.role) || (a.role === 'pilot' && !STAFF_GROUPS.includes(a.group))) return { ok: false, msg: 'Ungültige Berufsgruppe.' };
        const n = Math.floor(num(a.count)), start = a.start !== undefined && a.start !== null ? clamp(Math.round(num(a.start, 0)), 0, day + 180) : null;
        return a.type === 'hire' ? w.hire(al, a.role, a.group || null, n, start) : w.fire(al, a.role, a.group || null, n);
      }
      case 'fillStaff': {   // start: Antrittstag (Bedarf bis dahin, Einstellung zum Termin)
        let n = 0; const msgs = [];
        const start = a.start !== undefined && a.start !== null ? clamp(Math.round(num(a.start, 0)), day, day + 180) : null;
        for (const r of staffPlanOf(al, start ? start - day : undefined, day)) {
          const want = Math.ceil(r.need * (r.role === 'tech' ? 1 : 1.1) - r.have - r.pipe);
          if (want <= 0) continue;
          const k = Math.min(want, P.STAFF.maxHire[r.role]), res = w.hire(al, r.role, r.group, k, start);
          if (res.ok) n += k; else msgs.push(res.msg);
        }
        return { ok: true, n, msg: n ? `${n} Personen eingestellt.${msgs.length ? ' ' + msgs[0] : ''}` : (msgs[0] || 'Der Bedarf ist gedeckt.') };
      }
      case 'train': if (!STAFF_GROUPS.includes(a.from) || !STAFF_GROUPS.includes(a.to)) return { ok: false, msg: 'Ungültige Musterberechtigung.' }; return w.train(al, a.from, a.to, Math.floor(num(a.count)));
      case 'pay': { const v = clamp(num(a.v, 1), 0.8, 2.0); al.staff.pay = v; al.log(day, `Gehaltsniveau auf ${Math.abs(v - (w.macro.wage || 1)) < 0.005 ? 'Marktniveau' : (v > (w.macro.wage || 1) ? '+' : '') + Math.round((v / (w.macro.wage || 1) - 1) * 100) + ' % gegenüber Markt'} gesetzt`, 'staff'); return { ok: true }; }
      case 'agency': al.staff.agency = !!a.on; return { ok: true };
      case 'hireExpert': return w.hireExpert(al, a.cid);
      case 'fireExpert': return w.fireExpert(al, a.id);
      case 'expertContract': return w.expertContract(al, String(a.id || ''), String(a.kind || ''), a.v);
      case 'terminal': { if (!P.TERMINALS[a.v] || !P.AIRPORTS[a.apt]) return { ok: false, msg: 'Ungültig.' }; if (!al.stations[a.apt]) return { ok: false, msg: 'Dort haben Sie noch keine Station.' }; al.station(a.apt).terminal = a.v; al.log(day, `${a.apt}: ${P.TERMINALS[a.v].label} gebucht`, 'info'); const pr = al.plan(day); w.operableFreq(al); return { ok: true, msg: pr.ok ? null : 'Achtung: Mit der längeren Bodenzeit passen nicht mehr alle Umläufe auf die Flotte.' }; }
      case 'handling': { if (!['own', 'contract'].includes(a.v) || !P.AIRPORTS[a.apt]) return { ok: false, msg: 'Ungültig.' }; if (!al.stations[a.apt]) return { ok: false, msg: 'Dort haben Sie noch keine Station.' }; al.station(a.apt).handling = a.v; al.log(day, `${a.apt}: Abfertigung ${a.v === 'own' ? 'mit eigenem Team' : 'über Dienstleister'}`, 'info'); return { ok: true }; }
      case 'hangar': {
        if (!al.bases.includes(a.apt)) return { ok: false, msg: 'Hangars gibt es nur an Basen.' };
        if (al.hangars.includes(a.apt)) { al.hangars = al.hangars.filter((x) => x !== a.apt); al.log(day, `Hangar in ${a.apt} gekündigt`, 'info'); }
        else { al.hangars.push(a.apt); al.log(day, `Hangar in ${a.apt} gemietet`, 'info'); }
        return { ok: true };
      }
      case 'closeBase': { if (!P.AIRPORTS[a.apt]) return { ok: false, msg: 'Ungültig.' }; const r = w.closeBase(al, a.apt, a.to, !!a.force); if (r.ok && w.humans.length > 1) w.pushNews(day, `${al.name} schließt die Basis ${ap(a.apt).name}`, 'ai', al.id); return r; }
      case 'openBase': { if (!P.AIRPORTS[a.apt]) return { ok: false, msg: 'Ungültig.' }; const r = w.openBase(al, a.apt); if (r.ok && w.humans.length > 1) w.pushNews(day, `${al.name} eröffnet eine Basis in ${ap(a.apt).name}`, 'ai', al.id); return r; }
      case 'hedge': { const share = clamp(num(a.share), 0, P.FUEL_HEDGE.maxShare), months = [3, 6, 12].includes(num(a.months)) ? num(a.months) : 6; return w.setHedge(al, share, months); }
      case 'unhedge': return w.setHedge(al, 0, 0);
      case 'insurance': if (!P.INSURANCE[a.v]) return { ok: false, msg: 'Ungültig.' }; al.insurance = a.v; al.log(day, `Versicherung: ${P.INSURANCE[a.v].label}`, 'info'); return { ok: true };
      case 'marketing': {   // ältere Oberfläche: fester Monatsbetrag → Anteil am Umsatz
        const v = clamp(Math.round(num(a.v)), 0, 1e6), m = al.ledger.months.at(-1), rv = m ? ((m.acc.rev_ticket || 0) + (m.acc.rev_ancillary || 0)) / 100 : 0;
        al.mktPct = v ? clamp(rv > 0 ? v / rv : 0.03, 0.005, P.MKT_PCT_MAX) : 0; al.marketing = 0; return { ok: true };
      }
      case 'marketingPct': al.mktPct = clamp(Math.round(num(a.v) * 1000) / 1000, 0, P.MKT_PCT_MAX); al.marketing = 0; return { ok: true };
      case 'setCabin': return w.setCabin(al, String(a.haul || ''), num(a.f), num(a.b));
      case 'autoPrice': {   // id: eine Strecke; ohne id: alle Strecken und künftige. cfg: { min, max, spd, plf } (Teilangaben ergänzen die bisherigen)
        // keep (ohne id): nur Standard und Strecken mit eingeschalteter Automatik ändern, nichts ein- oder ausschalten
        const keep = !a.id && !!a.keep;
        const rs = a.id ? [route(a.id)].filter(Boolean) : al.activeRoutes().filter((r) => !keep || r.ap > 0);
        if (a.id && !rs.length) return { ok: false, msg: 'Strecke nicht gefunden.' };
        const prevLf = a.id ? rs[0].ap : al.apDefault || al.apLf, lf = a.on || keep ? clamp(Math.round(num(a.lf, prevLf || 0.85) * 100) / 100, 0.6, 0.98) : 0;
        const patch = a.cfg && typeof a.cfg === 'object' ? Object.fromEntries(Object.keys(P.PLAYER_AUTO_PRICE.def).filter((k) => Number.isFinite(Number(a.cfg[k])) && a.cfg[k] !== null && a.cfg[k] !== '').map((k) => [k, Number(a.cfg[k])])) : null;
        const baseCfg = apCfgOf(null, a.id ? rs[0].apo : al.apCfg), cfg = patch ? apCfgOf(null, { ...baseCfg, ...patch }) : null;
        for (const r of rs) {
          if (keep) { if (a.lf !== undefined) r.ap = lf; } else if (lf) r.ap = lf; else delete r.ap;
          if (cfg) r.apo = a.id ? cfg : apCfgOf(null, { ...apCfgOf(r), ...patch });
          if (a.reset && !a.id) r.apo = apCfgOf(null, al.apCfg);
        }
        if (!a.id) {
          if (!keep) al.apDefault = lf || 0;
          else if (a.lf !== undefined) { al.apLf = lf; if (al.apDefault > 0) al.apDefault = lf; }
          if (lf && !keep) al.apLf = lf;
          if (cfg) al.apCfg = cfg;
        }
        return { ok: true, n: rs.length };
      }
      case 'premPrice': {   // Premiumaufschlag einer Strecke (1 = Standard)
        const r = route(a.id); if (!r) return { ok: false, msg: 'Strecke nicht gefunden.' };
        const v = Math.round(clamp(num(a.v, 1), P.PREM_PRICE.min, P.PREM_PRICE.max) * 100) / 100;
        if (Math.abs(v - 1) < 0.005) delete r.pm; else r.pm = v;
        return { ok: true, pm: v };
      }
      case 'loyalty': return w.setLoyalty(al, num(a.lv));
      case 'hubLevel': return w.setHub(al, String(a.apt || ''), num(a.lv));
      case 'buySlots': return w.buySlots(al, String(a.apt || ''), a.n === 'all' ? 'all' : num(a.n));
      case 'sellSlots': return w.sellSlots(al, String(a.apt || ''), a.n === 'all' ? 'all' : num(a.n));
      case 'slotWait': return w.joinWait(al, String(a.apt || ''), num(a.n, 1));
      case 'slotWaitLeave': return w.leaveWait(al, String(a.id || ''));
      case 'savePlan': return w.savePlan(al, a);
      case 'deletePlan': return w.deletePlan(al, String(a.id || ''));
      case 'runPlan': return w.runPlan(al, String(a.id || ''));
      case 'planAuto': { const pl = (al.plans || []).find((x) => x.id === a.id); if (!pl) return { ok: false, msg: 'Plan nicht gefunden.' }; pl.auto = !!a.on; delete pl.failed; return { ok: true }; }
      case 'gateLock': return w.setGateLock(al, String(a.apt || ''), !!a.on);
      case 'cargo': al.cargo = !!a.on; al.log(day, al.cargo ? 'Frachtagent beauftragt: Beiladefracht wird vermarktet' : 'Frachtvermarktung beendet', 'info'); return { ok: true };
      case 'study': if (!P.AIRPORTS[a.a] || !P.AIRPORTS[a.b]) return { ok: false, msg: 'Ungültig.' }; return w.commissionStudy(al, a.a, a.b);
      case 'orderStudy': return w.orderStudy(al, String(a.kind || ''), String(a.tier || ''), a.focus || null);
      case 'loan': { const years = [3, 5, 8].includes(num(a.years)) ? num(a.years) : 5; return w.takeLoan(al, clamp(num(a.amount), 0, 50e6), years); }
      case 'repay': return w.repayLoan(al, a.id);
      case 'assistant': {
        const ids = ['lena', 'marco', 'aiko', 'sam'];
        if (!ids.includes(a.id)) return { ok: false, msg: 'Unbekannte Assistenz.' };
        al.assistant = { id: a.id, rem: a.rem !== false, rep: a.rep !== false, mon: a.mon !== false };
        return { ok: true };
      }
      case 'dealPropose': case 'dealRespond': case 'dealWithdraw': return dealAction(w, al, a);
      case 'assignAircraft': return assignAircraft(w, al, a);
      case 'bid': return w.bid(al, String(a.lot || ''), num(a.amount));
      case 'takeover': return takeover(w, al, String(a.target || ''));
      case 'academy': {
        if (!ACADEMY[a.role]) return { ok: false, msg: 'Unbekannte Akademie.' };
        const lv = clamp(Math.round(num(a.level)), 0, 3);
        al.academy = al.academy || {};
        const cur = al.academy[a.role] || { lv: 0, since: day };
        if (a.role === 'pilot') { if (a.group && !STAFF_GROUPS.includes(a.group)) return { ok: false, msg: 'Ungültige Musterberechtigung.' }; cur.group = a.group || cur.group || STAFF_GROUPS.find((g) => al.fleet.some((x) => P.AIRCRAFT_TYPES[x.type_id].group === g)) || 'A32F'; }
        if (!cur.lv && lv) cur.since = day;
        cur.lv = lv; al.academy[a.role] = cur;
        al.log(day, lv ? `${ACADEMY[a.role].label}: Förderstufe ${lv} (${Math.round(ACADEMY[a.role].cost[lv] / 1000)} Tsd. EUR im Monat)` : `${ACADEMY[a.role].label}: Förderung beendet`, 'staff');
        return { ok: true };
      }
      case 'poach': return w.poach(al, a.target, a.role, a.group || null, num(a.n, 1), num(a.bonus));
      case 'poachExpert': return w.poachExpert(al, a.target, a.id, num(a.factor, 1.2));
      case 'setRivals': { if (!setRivals(w, a.key)) return { ok: false, msg: 'Unbekannte Stufe.' }; w.pushNews(day, `Die Konkurrenz spielt jetzt „${RIVALS[a.key].label}“`, 'info', null); return { ok: true }; }
      case 'setLogo': {
        const hex = (c) => (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : null);
        if (!LOGO_SHAPES.includes(a.shape) || !LOGO_SYMBOLS.includes(a.sym) || !hex(a.c1) || !hex(a.c2)) return { ok: false, msg: 'Ungültiges Logo.' };
        const nl = { shape: a.shape, sym: a.sym, c1: hex(a.c1), c2: hex(a.c2) }, taken = logoTaken(w, al, nl);
        if (taken) return { ok: false, msg: `Genau dieses Logo trägt schon ${taken.name}. Bitte Form, Symbol oder eine Farbe ändern.` };
        al.logo = nl;
        al.log(day, 'Neues Logo eingeführt', 'info');
        return { ok: true };
      }
      case 'setPixLogo': {
        if (a.clear) { if (al.pixLogo) { delete al.pixLogo; al.log(day, 'Pixel-Logo entfernt – es gilt wieder das gestaltete Logo', 'info'); } return { ok: true }; }
        const v = pixValid(a); if (!v) return { ok: false, msg: 'Ungültiges Pixel-Logo.' };
        if (/^A+=*$/.test(v.px)) return { ok: false, msg: 'Das Bild ist noch leer – bitte etwas zeichnen.' };
        const tk = w.list.find((o) => o !== al && o.pixLogo && o.pixLogo.px === v.px && o.pixLogo.pal.join() === v.pal.join());
        if (tk) return { ok: false, msg: `Genau dieses Pixel-Logo trägt schon ${tk.name}. Bitte etwas ändern.` };
        al.pixLogo = v; al.log(day, 'Neues Pixel-Logo eingeführt', 'info');
        return { ok: true };
      }
      case 'decide': if (!['raise5', 'bonus', 'reject'].includes(a.choice)) return { ok: false, msg: 'Ungültig.' }; w.resolveDecision(al, a.id, a.choice); return { ok: true };
      default: return { ok: false, msg: 'Unbekannte Aktion.' };
    }
  }
  /** Pixel-Logo 64×64: Palette mit bis zu 15 Farben, Bild als Base64 (4 Bit je Pixel, 0 = durchsichtig). */
  const PIX = { n: 64, b64: 2732, pal: 15 };
  function pixValid(a) {
    if (!a || !Array.isArray(a.pal) || typeof a.px !== 'string') return null;
    const pal = a.pal.slice(0, PIX.pal).map((c) => (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : null));
    if (!pal.length || pal.some((c) => !c)) return null;
    if (a.px.length !== PIX.b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(a.px)) return null;
    return { pal, px: a.px };
  }
  function balanceSheet(al) {
    const cash = al.ledger.cash / 100;
    const nbv = al.fleet.filter((a) => a.owned).reduce((s, a) => s + a.nbv, 0);
    const deposits = al.fleet.reduce((s, a) => s + a.deposit, 0);
    const loansAc = al.fleet.filter((a) => a.owned).reduce((s, a) => s + a.loan, 0);
    const bank = al.loans.reduce((s, l) => s + l.balance, 0);
    const slots = al.slotBookTotal ? al.slotBookTotal() : 0;
    const assets = cash + nbv + deposits + slots, liabilities = loansAc + bank + al.creditUsed;
    const leaseLiab = al.fleet.filter((a) => !a.owned && !a.flex).reduce((s, a) => s + (a.leaseMonth || 0) * 24, 0);
    return { cash, nbv, deposits, slots, assets, loans: loansAc, bank, credit: al.creditUsed, liabilities, equity: assets - liabilities, leaseLiab,
      check: assets - liabilities - (al.ledger.equityContrib / 100 + al.ledger.netIncome()) };
  }

  // ===========================================================================
  // Spielstand (kompakt)
  // ===========================================================================
  const HIST_KEYS = ['flights', 'seats', 'cancelled', 'cost', 'block_h', 'pax', 'rev', 'pax_out', 'pax_in', 'seats_out', 'seats_in', 'late', 'demand_out', 'demand_in', 'spill_out', 'spill_in', 'tr_out', 'tr_in', 'cargo', 'prem', 'd', 'trd', 'ps'];
  const AI_HIST_KEYS = ['seats', 'pax', 'rev', 'cost', 'pax_out', 'pax_in', 'seats_out', 'seats_in'];
  const r1 = (x) => Math.round(x * 10) / 10;
  function serialize(w, opt = {}) {
    const aiH = opt.compact ? -8 : -30, plH = opt.compact ? -30 : -60;
    return {
      v: 4, param: P.VERSION, day: w.day, difficulty: w.difficulty, mode: w.mode || 'free', rivals: w.rivals || null, rng: w.rng.s, macro: w.macro, fuelHist: w.fuelHist.slice(-370),
      playerId: w.playerId, order: w.order, news: w.news.slice(-120), events: w.events.filter((e) => e.end + (e.recovery || 0) > w.day - 30), eventCounter: w.eventCounter,
      seed: w.seed, slotCap: w.slotCap, slotV: w.slotV || undefined, eventMult: w.eventMult,
      candidates: w.candidates, acMarket: w.acMarket, acmiOffers: w.acmiOffers, offerCounter: w.offerCounter,
      deals: w.deals.filter((d) => d.status === 'open' || d.day > w.day - 400).slice(-120), dealCounter: w.dealCounter, agreements: (w.agreements || []).filter((g) => g.until > w.day), slotWait: w.slotWait && w.slotWait.length ? w.slotWait : undefined, waitCounter: w.waitCounter || undefined,
      entrantCounter: w.entrantCounter || 0, coops: (w.coops || []).filter((c) => c.until > w.day), auctions: (w.auctions || []).filter((a) => !a.done || a.closes > w.day - 90), lessorQueue: w.lessorQueue || {}, labor: w.labor, lessorStock: w.lessorStock || {},
      airlines: w.list.map((al) => ({
        id: al.id, name: al.name, archetype: al.archetype, color: al.color, code: al.code, difficulty: al.difficulty, sigma: al.sigma, owner: al.owner || null, joinedDay: al.joinedDay || 0, prefTypes: al.prefTypes || null,
        bases: al.bases, fleet: al.fleet.map((a) => { const { assigned, fhDay, ...rest } = a; return rest; }),
        routes: al.routes.filter((r) => !r.closed || (al.isPlayer && (w.day - (r.closedDay ?? w.day)) < 60)).map((r) => ({
          id: r.id, airline: r.airline, base: r.base, dest: r.dest, type_id: r.type_id, freq: r.freq, fare_out: r.fare_out, fare_in: r.fare_in,
          service: r.service, buffer: r.buffer, opened_day: r.opened_day, pending: r.pending, autoPrice: r.autoPrice, targetLf: r.targetLf,
          closed: r.closed, closedDay: r.closedDay, reviewNeg: r.reviewNeg, lastChange: r.lastChange, hk: al.isPlayer ? 0 : 1, wk: r.wk > 0 && r.wk < 7 ? r.wk : undefined, role: r.role || undefined, cab: r.cab || undefined, ap: r.ap || undefined, apo: r.apo || undefined, pm: r.pm || undefined, trDem: r.trDem ? { out: r.trDem.out, in: r.trDem.in } : undefined,
          hist: (al.isPlayer ? r.hist.slice(plH) : r.hist.slice(aiH)).map((h) => (al.isPlayer ? HIST_KEYS : AI_HIST_KEYS).map((k) => (k === 'block_h' ? r1(h[k] || 0) : Math.round(h[k] || 0)))),
        })),
        typesIntroduced: al.typesIntroduced, creditUsed: al.creditUsed, lossCarry: al.lossCarry, monthPnlStart: al.monthPnlStart,
        distressDays: al.distressDays, status: al.status, events: al.events.slice(al.isPlayer ? -150 : -10), otpHist: al.otpHist,
        maxFleet: al.maxFleet, warnLevel: al.warnLevel, acCounter: al.acCounter, routeCounter: al.routeCounter, rngF: al.rngForecast.s,
        assistant: al.assistant || null, logo: al.logo || null, brand: al.brand, marketing: al.marketing, mktPct: al.mktPct || 0, apDefault: al.apDefault || 0, apLf: al.apLf || undefined, apCfg: al.apCfg || null, cabin: al.cabin || null, loyalty: al.loyalty || null, hubs: al.hubs || null, gateLock: al.gateLock || null, cargo: al.cargo, loans: al.loans, rating: al.rating, insurance: al.insurance, hedge: al.hedge,
        experts: al.experts, studies: al.studies, stations: al.stations, hangars: al.hangars, slotHold: al.slotHold, slotBook: al.slotBook || undefined, hubSlots: al.hubSlots || undefined, prog: al.prog || undefined, mk: al.mk || undefined, stageLv: al.stageLv ?? undefined, acqLog: al.acqLog || undefined, pixLogo: al.pixLogo || undefined, plans: al.plans && al.plans.length ? al.plans : undefined, poachLog: al.poachLog || null, grudge: al.grudge || null, rescued: !!al.rescued, academy: al.academy || null, past: al.past || null, reports: al.isPlayer && al.reports && al.reports.length ? al.reports : null, paxTotal: Math.round(al.paxTotal || 0), lineCut: !!al.lineCut, removed: al.removed ? true : undefined, removedDay: al.removed ? al.removedDay : undefined, netHist: al.isPlayer ? (al.netHist || []).slice(-400) : null, dayHist: al.isPlayer ? (al.dayHist || []).slice(-90) : null, decisions: al.decisions.slice(-20), milestones: al.milestones,
        staff: al.staff ? { ...al.staff, cov: al.isPlayer && al.staff.cov ? { ...al.staff.cov, need: { pil: al.staff.cov.need.pil, cab: al.staff.cov.need.cab } } : null } : null, runway: isFinite(al.runway) ? al.runway : null,
        ledger: { pnl: al.ledger.pnl, cash: al.ledger.cash, equityContrib: al.ledger.equityContrib, month: al.ledger.month, lastDay: al.ledger.lastDay || 0,
          months: al.ledger.months.slice(al.isPlayer ? -24 : -6), cashHist: al.ledger.cashHist.slice(al.isPlayer ? -400 : -30).map((x) => Math.round(x)) },
      })),
    };
  }
  function deserialize(s) {
    if (s.v !== 4) throw new Error('Spielstand aus einer älteren Version');
    const w = new World(1);
    Object.assign(w, { difficulty: s.difficulty || 'normal', mode: s.mode || 'career', rivals: s.rivals || null, day: s.day, macro: s.macro, fuelHist: s.fuelHist || [], playerId: s.playerId, news: s.news || [], events: s.events || [], eventCounter: s.eventCounter || 0,
      seed: s.seed, slotCap: s.slotCap || {}, slotV: s.slotV || 0, eventMult: s.eventMult || 1, candidates: s.candidates || [], acMarket: (s.acMarket || []).filter((o) => P.AIRCRAFT_TYPES[o.type] && !P.AIRCRAFT_TYPES[o.type].launch), acmiOffers: s.acmiOffers || [], offerCounter: s.offerCounter || 0,
      entrantCounter: s.entrantCounter || 0, deals: s.deals || [], dealCounter: s.dealCounter || 0, agreements: s.agreements || [], slotWait: s.slotWait || [], waitCounter: s.waitCounter || 0, coops: s.coops || [], auctions: s.auctions || [],
      lessorStock: s.lessorStock || {}, lessorQueue: s.lessorQueue || {}, labor: s.labor || { m: 0, pilot: 0, cabin: 0, tech: 0, aiAc: 0 } });
    w.macro = Object.assign({ tariffs: {}, carbon: {}, feeMult: {}, wage: 1, fuelPressure: 0, cycle: { phase: 0, period: 54, amp: 0.08 } }, w.macro);
    setFuelX(w);
    for (const c of COUNTRIES) { if (w.macro.econ[c] === undefined) w.macro.econ[c] = 1; if (w.macro.econTarget[c] === undefined) w.macro.econTarget[c] = 1; if (w.macro.taxDelta[c] === undefined) w.macro.taxDelta[c] = 0; }
    w.rng.s = s.rng;
    for (const a of s.airlines) {
      const al = new Airline(a.id, a.name, a.bases[0], a.archetype, 0, a.maxFleet, a.color);
      const { ledger, rngF, routes, runway, ...rest } = a;
      Object.assign(al, rest);
      al.runway = runway === null ? Infinity : runway;
      al.rngForecast.s = rngF;
      Object.assign(al.ledger, ledger);
      al._day = s.day;
      if (!al.poachLog) delete al.poachLog;
      if (!al.grudge) delete al.grudge;
      if (!al.academy) delete al.academy;
      if (!al.past) delete al.past;
      if (!al.reports) delete al.reports;
      for (const k of ['cabin', 'loyalty', 'hubs', 'gateLock', 'apCfg']) if (!al[k]) delete al[k];
      if (al.staff && al.staff.pil) for (const g of STAFF_GROUPS) if (typeof al.staff.pil[g] !== 'number') al.staff.pil[g] = 0;
      // ältere Stände: Einstellungen mit sehr langer Wartezeit (früher bis 100 Tage) auf die heutige Höchstdauer kappen
      if (al.staff && al.staff.pipeline) for (const p of al.staff.pipeline) if (p.kind === 'hire' && P.STAFF.lead[p.role] && !p.sched) { const mx = s.day + Math.round(P.STAFF.lead[p.role] * P.STAFF.leadMaxFactor); if (p.ready > mx) p.ready = mx; }
      al.routes = routes.map((r) => {
        const keys = r.hk ? AI_HIST_KEYS : HIST_KEYS;
        const { hist, hk, ...rr } = r;
        const rt = new Route({ ...rr, hist: [] });
        if (!a.archetype) rt.autoPrice = false;
        rt.hist = hist.map((arr) => { const o = Object.fromEntries(HIST_KEYS.map((k) => [k, 0])); keys.forEach((k, i) => { o[k] = arr[i] ?? 0; }); return o; });
        if (!rt.cab) { delete rt.cab; if (a.archetype === 'premium' && !rt.closed) rt.cab = cabClone(P.CABIN.ai); }   // ältere Welten: Premium-KI bekommt Business
        return rt;
      });
      w.add(al);
    }
    w.order = s.order;
    // ältere Stände: Slots jetzt an jedem Flughafen nach Einzugsgebiet (bestehende Flüge bleiben erlaubt)
    if (!w.slotV) { for (const c of AP_CODES) w.slotCap[c] = Math.max(apx(c).simCap, w.slotUse(c)); w.slotV = 2; }
    return w;
  }

  return {
    P, AP_CODES, MONTH_STARTS, COUNTRIES, COUNTRY_NAMES, STAFF_GROUPS, EVENT_TYPES, Rng, ap, apx, gcDistanceKm, blockHours, refPrice, railShare, railTime, accessibility,
    qBase, qPot, seasonFactor, offer, withIndirect, choiceProbs, allocate, legCosts, sumCosts, aircraftDayFixedGeneric, rotationHours, turnHours, rangeOk, aptOk, aptWhy, sstBonus,
    ovhAc, incentiveAt, evaluateRoute, monthOf, Ledger, Route, Airline, World, routeDb, routeLf, priceFloor, aiRulePrice, destFits, newGame, newWorld, addHuman, restartHuman, crewFor, applyAction, acquireCost, staffPlanOf, balanceSheet, serialize, deserialize,
    RIVALS, setRivals, MARKET, potSum, studyFocus, focusLabel, acMatches, resolveItems, ACADEMY, MILESTONES, stockCap, laborPool, hireLead, LOGO_SHAPES, LOGO_SYMBOLS, logoTaken, DAY_GROUPS, dayGroupsOf, capOf, apCfgOf, kOf, setFuelX, kickHuman, adminGrant, adminEvents, expertPerf, expertTalent, PIX, pixValid, maValue, maBlock, riskTerms, baseSetupCost, baseDayCost, CAREER, careerLv, careerOf, careerChecks, careerUnlockTxt, careerAcqLeft, careerTypeMsg, typeLevel, typeAllowed, needTxt, startBaseMsg, licenceFee, haulOf, cabinSeats, cabinRevenue, cabClone, slotValue, blocOf, blocName, makerBloc, tariffBetween, acTariff, leaseDelivery, EU, aiDealValue, dealText, itemText, acFairValue, acDealValue, acBookValue, slotValue, exitLoss, exitGain, barred, checkSide, cleanItems, EXIT_DAYS, DEAL_DAYS,
    PNL_ACCOUNTS, COST_KEYS, DIFFICULTY, AI_SETUP, SPEEDS, speedKey, COUNTRY_LABEL, COUNTRY_DATA, REGION_ORDER, winOf, acShareOf, pilotsFor, routeKmOk, sumObj, INDIRECT_ID, INCUMBENT_ID, pairKey, roleLabel, cargoDemand, cargoYield, clamp, lv3,
  };
})();
if (typeof module !== 'undefined') module.exports = SM;
