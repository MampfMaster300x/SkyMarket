# Weltweite Flughafendaten für SKYMARKET (Top 100 nach Passagieren + bisherige Europa-Flughäfen)
# Rang 1-50: Wikipedia "List of busiest airports by passenger traffic" (2025-Daten, abgerufen 20.10.2026)
# Rang 51-100: Stand 2024, gerundet (Reihenfolge innerhalb dieses Blocks ungefähr)
# Felder: code, Stadt (de), lat, lon, Land, Einzugsgebiet Mio., Geschäft, Tourismus, Passagiere Mio.
AIRPORTS = """
ATL|Atlanta|33.64|-84.43|US|6.3|1.2|1.0|106
DXB|Dubai|25.25|55.36|AE|3.6|1.3|2.0|95
HND|Tokio-Haneda|35.55|139.78|JP|25|1.6|1.3|92
DFW|Dallas|32.90|-97.04|US|8|1.3|0.8|86
PVG|Shanghai-Pudong|31.14|121.81|CN|15|1.4|1.2|85
ORD|Chicago|41.98|-87.90|US|9.5|1.5|1.1|85
LHR|London-Heathrow|51.47|-0.45|GB|14|1.8|1.6|84
IST|Istanbul|41.26|28.74|TR|12|1.2|1.8|84
CAN|Guangzhou|23.39|113.30|CN|19|1.2|0.9|84
DEN|Denver|39.86|-104.67|US|3.5|1.0|1.2|82
DEL|Delhi|28.56|77.10|IN|30|1.0|1.2|78
ICN|Seoul-Incheon|37.46|126.44|KR|22|1.3|1.3|74
LAX|Los Angeles|33.94|-118.41|US|13|1.3|1.5|74
CDG|Paris-CDG|49.01|2.55|FR|12|1.6|1.7|72
PEK|Peking-Capital|40.08|116.58|CN|14|1.4|1.2|71
SIN|Singapur|1.36|103.99|SG|6|1.6|1.5|70
AMS|Amsterdam|52.31|4.77|NL|4|1.3|1.3|69
MAD|Madrid|40.47|-3.57|ES|7|1.2|1.4|68
SZX|Shenzhen|22.64|113.81|CN|13|1.3|0.6|66
KUL|Kuala Lumpur|2.75|101.71|MY|8|1.1|1.3|63
FRA|Frankfurt|50.03|8.57|DE|5.8|1.5|0.7|63
BKK|Bangkok|13.69|100.75|TH|12|1.0|2.2|63
JFK|New York-JFK|40.64|-73.78|US|12|1.8|1.6|63
HKG|Hongkong|22.31|113.92|HK|7.5|1.7|1.6|61
MCO|Orlando|28.43|-81.31|US|2.8|0.5|3.0|58
BCN|Barcelona|41.30|2.08|ES|5.5|1.0|1.8|57
TFU|Chengdu-Tianfu|30.31|104.44|CN|9|1.0|1.1|57
BOM|Mumbai|19.09|72.87|IN|22|1.3|1.0|56
MIA|Miami|25.80|-80.29|US|6|1.2|2.2|55
LAS|Las Vegas|36.08|-115.15|US|2.3|0.6|3.0|55
CGK|Jakarta|-6.13|106.66|ID|30|1.0|0.8|55
SFO|San Francisco|37.62|-122.38|US|7.5|1.6|1.4|55
DOH|Doha|25.27|51.61|QA|2.5|1.1|0.8|54
CLT|Charlotte|35.21|-80.94|US|2.8|1.0|0.7|54
PKX|Peking-Daxing|39.51|116.41|CN|8|1.0|1.0|54
JED|Dschidda|21.68|39.16|SA|4.5|0.9|1.2|53
SEA|Seattle|47.45|-122.31|US|4.2|1.3|1.1|53
MNL|Manila|14.51|121.02|PH|25|1.0|0.9|52
PHX|Phoenix|33.43|-112.01|US|5|1.0|1.2|52
FCO|Rom|41.80|12.24|IT|4.3|1.0|1.7|51
HGH|Hangzhou|30.23|120.43|CN|12|1.1|1.2|50
SHA|Shanghai-Hongqiao|31.20|121.34|CN|10|1.3|0.9|50
CKG|Chongqing|29.72|106.64|CN|15|0.9|0.9|50
KMG|Kunming|25.10|102.93|CN|8|0.8|1.3|50
XIY|Xi'an|34.45|108.75|CN|13|0.8|1.2|49
SAW|Istanbul-Sabiha|40.90|29.31|TR|6|0.8|1.0|48
IAH|Houston|29.99|-95.34|US|7|1.3|0.8|48
TPE|Taipeh|25.08|121.23|TW|9|1.2|1.2|48
YYZ|Toronto|43.68|-79.63|CA|7|1.3|1.1|47
GRU|São Paulo|-23.43|-46.47|BR|22|1.2|0.9|47
EWR|New York-Newark|40.69|-74.17|US|7|1.3|1.0|49
MEX|Mexiko-Stadt|19.44|-99.07|MX|22|1.1|1.2|45
BOG|Bogotá|4.70|-74.15|CO|11|1.0|0.9|45
BOS|Boston|42.36|-71.01|US|5|1.5|1.2|43
LGW|London-Gatwick|51.15|-0.19|GB|6|0.9|1.8|43
MUC|München|48.35|11.79|DE|4.6|1.3|1.0|42
BLR|Bengaluru|13.20|77.71|IN|13|1.2|0.8|41
SVO|Moskau|55.97|37.41|RU|12|1.1|1.0|40
SYD|Sydney|-33.94|151.18|AU|5.5|1.3|1.6|41
SGN|Ho-Chi-Minh-Stadt|10.82|106.66|VN|12|0.9|1.1|41
NRT|Tokio-Narita|35.77|140.39|JP|12|1.0|1.4|38
AYT|Antalya|36.90|30.80|TR|2.7|0.2|3.5|38
RUH|Riad|24.96|46.70|SA|7.5|1.1|0.6|37
MSP|Minneapolis|44.88|-93.22|US|3.7|1.1|0.7|37
MEL|Melbourne|-37.67|144.84|AU|5.2|1.1|1.2|37
FLL|Fort Lauderdale|26.07|-80.15|US|4|0.7|1.8|35
LIS|Lissabon|38.77|-9.13|PT|2.9|0.8|1.6|35
LGA|New York-LaGuardia|40.78|-73.87|US|7|1.5|1.0|33
PMI|Palma|39.55|2.74|ES|0.9|0.3|2.5|33
DUB|Dublin|53.43|-6.27|IE|2.2|1.2|1.3|33
ORY|Paris-Orly|48.72|2.38|FR|5|0.9|1.4|33
NKG|Nanjing|31.74|118.86|CN|9|1.0|0.9|32
CUN|Cancún|21.04|-86.88|MX|1.0|0.2|3.5|32
DTW|Detroit|42.21|-83.35|US|4.3|1.0|0.6|32
PHL|Philadelphia|39.87|-75.24|US|6.2|1.2|0.9|32
ATH|Athen|37.94|23.94|GR|3.8|0.8|1.8|32
KIX|Osaka-Kansai|34.43|135.24|JP|15|1.2|1.5|31
CTU|Chengdu-Shuangliu|30.58|103.95|CN|9|1.1|1.0|31
ZRH|Zürich|47.46|8.55|CH|2|1.5|1.3|31
CSX|Changsha|28.19|113.22|CN|10|0.8|0.9|30
WUH|Wuhan|30.78|114.21|CN|12|0.9|0.8|30
CAI|Kairo|30.12|31.41|EG|22|0.9|1.5|30
CPH|Kopenhagen|55.62|12.66|DK|2.1|1.2|1.2|30
MAN|Manchester|53.35|-2.27|GB|3.5|0.9|0.9|30
AUH|Abu Dhabi|24.43|54.65|AE|1.5|1.1|1.0|29
XMN|Xiamen|24.54|118.13|CN|5|0.9|1.2|29
CJU|Jeju|33.51|126.49|KR|0.7|0.2|2.5|29
HAN|Hanoi|21.22|105.81|VN|8.5|1.0|1.1|29
TAO|Qingdao|36.36|120.09|CN|10|0.9|1.1|29
DMK|Bangkok-Don Mueang|13.91|100.61|TH|5|0.6|1.2|29
HYD|Hyderabad|17.24|78.43|IN|10|1.0|0.7|29
SLC|Salt Lake City|40.79|-111.98|US|2.5|0.9|1.0|28
SCL|Santiago de Chile|-33.39|-70.79|CL|7|1.0|0.9|27
YVR|Vancouver|49.19|-123.18|CA|2.7|1.1|1.3|27
BWI|Baltimore|39.18|-76.67|US|2.8|0.9|0.8|27
IAD|Washington-Dulles|38.95|-77.46|US|3.5|1.3|0.9|26
DCA|Washington-Reagan|38.85|-77.04|US|3.5|1.6|1.0|26
LIM|Lima|-12.02|-77.11|PE|11|1.0|1.0|25
SAN|San Diego|32.73|-117.19|US|3.3|1.0|1.5|25
TPA|Tampa|27.98|-82.53|US|3.2|0.8|1.6|25
VIE|Wien|48.11|16.57|AT|3.0|1.0|1.2|32
BER|Berlin|52.37|13.50|DE|6.0|1.0|1.3|25
DUS|Düsseldorf|51.29|6.77|DE|7.0|1.1|0.5|20
HAM|Hamburg|53.63|9.99|DE|3.2|1.0|0.9|15
"""
EXTRA = {'VIE', 'BER', 'DUS', 'HAM'}   # nicht in den Top 100, aus der Europa-Version übernommen

# Land: Dativ-Name, Kurzname, Region, Einkommen, Landeentgelt €/t, Pax-Entgelt €, Ticketsteuer €, Steuer Langstrecke €, Kerosin-Faktor, Kosten-Faktor, Abfertigungs-Faktor
COUNTRIES = {
 'US': ('den USA', 'USA', 'Nordamerika', 1.35, 4, 14, 18, 40, 0.95, 1.2, 1.1),
 'CA': ('Kanada', 'Kanada', 'Nordamerika', 1.15, 6, 25, 15, 30, 1.0, 1.1, 1.05),
 'MX': ('Mexiko', 'Mexiko', 'Lateinamerika', 0.52, 5, 25, 15, 40, 1.05, 0.8, 0.8),
 'CO': ('Kolumbien', 'Kolumbien', 'Lateinamerika', 0.42, 4, 18, 15, 35, 1.1, 0.7, 0.8),
 'PE': ('Peru', 'Peru', 'Lateinamerika', 0.42, 4, 20, 12, 30, 1.1, 0.7, 0.8),
 'CL': ('Chile', 'Chile', 'Lateinamerika', 0.62, 5, 22, 12, 30, 1.1, 0.8, 0.85),
 'BR': ('Brasilien', 'Brasilien', 'Lateinamerika', 0.50, 5, 15, 10, 25, 1.1, 0.8, 0.8),
 'GB': ('Großbritannien', 'Großbritannien', 'Europa', 1.15, 9, 30, 15, 95, 1.06, 1.3, 1.2),
 'FR': ('Frankreich', 'Frankreich', 'Europa', 1.10, 9, 24, 7, 30, 1.03, 1.3, 1.1),
 'ES': ('Spanien', 'Spanien', 'Europa', 0.85, 5, 15, 0, 0, 1.03, 1.0, 0.95),
 'IT': ('Italien', 'Italien', 'Europa', 0.85, 7, 20, 7, 7, 1.03, 1.1, 1.0),
 'PT': ('Portugal', 'Portugal', 'Europa', 0.75, 6, 18, 0, 0, 1.04, 0.85, 0.9),
 'NL': ('den Niederlanden', 'Niederlande', 'Europa', 1.15, 8, 33, 29, 29, 1.02, 1.4, 1.1),
 'DE': ('Deutschland', 'Deutschland', 'Europa', 1.10, 7, 20, 15, 60, 1.0, 1.1, 1.0),
 'AT': ('Österreich', 'Österreich', 'Europa', 1.05, 8, 25, 12, 12, 1.01, 1.1, 1.0),
 'CH': ('der Schweiz', 'Schweiz', 'Europa', 1.50, 9, 30, 0, 0, 1.03, 1.6, 1.3),
 'IE': ('Irland', 'Irland', 'Europa', 1.30, 6, 20, 0, 0, 1.03, 1.1, 1.0),
 'DK': ('Dänemark', 'Dänemark', 'Europa', 1.30, 7, 22, 0, 0, 1.02, 1.2, 1.1),
 'GR': ('Griechenland', 'Griechenland', 'Europa', 0.60, 6, 22, 0, 0, 1.04, 0.9, 0.9),
 'TR': ('der Türkei', 'Türkei', 'Europa', 0.45, 4, 15, 5, 10, 1.0, 0.8, 0.8),
 'RU': ('Russland', 'Russland', 'Europa', 0.45, 5, 12, 0, 0, 0.95, 0.9, 0.85),
 'AE': ('den Vereinigten Arabischen Emiraten', 'VAE', 'Nahost & Afrika', 1.20, 5, 20, 10, 10, 0.9, 1.2, 1.0),
 'QA': ('Katar', 'Katar', 'Nahost & Afrika', 1.40, 5, 20, 10, 10, 0.9, 1.2, 1.0),
 'SA': ('Saudi-Arabien', 'Saudi-Arabien', 'Nahost & Afrika', 0.80, 5, 18, 12, 20, 0.85, 1.0, 0.9),
 'EG': ('Ägypten', 'Ägypten', 'Nahost & Afrika', 0.20, 4, 15, 10, 25, 1.0, 0.6, 0.7),
 'IN': ('Indien', 'Indien', 'Asien', 0.18, 4, 8, 4, 8, 1.2, 0.6, 0.6),
 'CN': ('China', 'China', 'Asien', 0.45, 5, 12, 6, 12, 1.05, 0.9, 0.8),
 'HK': ('Hongkong', 'Hongkong', 'Asien', 1.10, 7, 15, 15, 15, 1.03, 1.5, 1.2),
 'TW': ('Taiwan', 'Taiwan', 'Asien', 0.90, 6, 15, 10, 10, 1.03, 1.0, 0.9),
 'KR': ('Südkorea', 'Südkorea', 'Asien', 0.90, 6, 15, 7, 7, 1.03, 1.0, 0.9),
 'JP': ('Japan', 'Japan', 'Asien', 0.95, 9, 22, 7, 7, 1.05, 1.4, 1.2),
 'SG': ('Singapur', 'Singapur', 'Asien', 1.40, 7, 30, 8, 8, 1.0, 1.4, 1.1),
 'MY': ('Malaysia', 'Malaysia', 'Asien', 0.50, 4, 12, 4, 8, 1.0, 0.7, 0.7),
 'TH': ('Thailand', 'Thailand', 'Asien', 0.35, 4, 15, 4, 8, 1.03, 0.7, 0.7),
 'ID': ('Indonesien', 'Indonesien', 'Asien', 0.25, 4, 10, 4, 8, 1.08, 0.6, 0.6),
 'PH': ('den Philippinen', 'Philippinen', 'Asien', 0.22, 4, 12, 4, 25, 1.08, 0.6, 0.6),
 'VN': ('Vietnam', 'Vietnam', 'Asien', 0.25, 4, 12, 4, 8, 1.05, 0.6, 0.6),
 'AU': ('Australien', 'Australien', 'Ozeanien', 1.25, 8, 25, 35, 40, 1.05, 1.3, 1.2),
}
# Slotkoordinierte Flughäfen: (zusätzliche Slots, Entgelt je Bewegung)
SLOTS = {
 'LGW': (6, 150), 'JFK': (6, 300), 'LGA': (4, 250), 'EWR': (6, 200), 'DCA': (4, 200), 'HND': (4, 300), 'NRT': (8, 120),
 'PEK': (6, 150), 'PKX': (10, 80), 'PVG': (8, 120), 'SHA': (4, 150), 'CAN': (8, 100), 'SZX': (8, 80), 'HKG': (6, 200),
 'SIN': (8, 150), 'ICN': (8, 100), 'TPE': (8, 80), 'BKK': (8, 100), 'DXB': (8, 150), 'DOH': (10, 100), 'IST': (8, 100),
 'ORY': (6, 120), 'MAD': (8, 120), 'DUB': (8, 80), 'ZRH': (6, 150), 'SYD': (6, 150), 'MEX': (4, 100), 'GRU': (8, 80),
 'BOM': (4, 100), 'DEL': (8, 80), 'CGK': (8, 60), 'MNL': (6, 80), 'KUL': (10, 60),
}
# Ferienziele mit Saisonprofil
SEASON = {'PMI': 'island', 'BCN': 'sun', 'FCO': 'sun', 'LIS': 'sun', 'AYT': 'island', 'CJU': 'sun', 'ATH': 'sun',
          'CUN': 'winter_sun', 'MCO': 'winter_sun', 'MIA': 'winter_sun', 'FLL': 'winter_sun', 'TPA': 'winter_sun', 'LAS': 'city',
          'BKK': 'winter_sun', 'DMK': 'winter_sun', 'DXB': 'winter_sun', 'AUH': 'winter_sun', 'SYD': 'sun', 'MEL': 'sun', 'SAN': 'sun', 'CAI': 'winter_sun'}
# Europa-Flughäfen aus v0.1–v0.3 behalten ihre kalibrierten Werte
OLD = {
 'HAM': dict(pop=3.2, income=1.10, biz=1.00, tour=0.90, land=7, paxfee=17, tax=15, taxi=0.00, cost=1.00, fuel=1.00, hand=1.00, slots=None, slotFee=0),
 'BER': dict(pop=6.0, income=0.95, biz=1.00, tour=1.30, land=6, paxfee=18, tax=15, taxi=0.00, cost=1.00, fuel=1.00, hand=1.00, slots=None, slotFee=0),
 'FRA': dict(pop=5.8, income=1.15, biz=1.50, tour=0.70, land=9, paxfee=26, tax=15, taxi=0.10, cost=1.30, fuel=1.02, hand=1.10, slots=6, slotFee=150),
 'MUC': dict(pop=4.6, income=1.20, biz=1.30, tour=1.00, land=8, paxfee=25, tax=15, taxi=0.05, cost=1.30, fuel=1.02, hand=1.08, slots=8, slotFee=120),
 'DUS': dict(pop=7.0, income=1.00, biz=1.10, tour=0.50, land=7, paxfee=19, tax=15, taxi=0.00, cost=1.10, fuel=1.00, hand=1.00, slots=None, slotFee=0),
 'LHR': dict(pop=14.0, income=1.15, biz=1.80, tour=1.60, land=12, paxfee=52, tax=15, taxi=0.15, cost=2.00, fuel=1.06, hand=1.30, slots=4, slotFee=400),
 'CDG': dict(pop=12.0, income=1.10, biz=1.60, tour=1.70, land=9, paxfee=24, tax=7, taxi=0.15, cost=1.50, fuel=1.03, hand=1.15, slots=8, slotFee=150),
 'AMS': dict(pop=4.0, income=1.15, biz=1.30, tour=1.30, land=8, paxfee=33, tax=29, taxi=0.10, cost=1.40, fuel=1.02, hand=1.10, slots=6, slotFee=150),
 'VIE': dict(pop=3.0, income=1.05, biz=1.00, tour=1.20, land=8, paxfee=25, tax=12, taxi=0.00, cost=1.10, fuel=1.01, hand=1.00, slots=None, slotFee=0),
 'BCN': dict(pop=5.5, income=0.85, biz=1.00, tour=1.80, land=5, paxfee=15, tax=0, taxi=0.00, cost=1.00, fuel=1.03, hand=0.95, slots=None, slotFee=0),
 'PMI': dict(pop=0.9, income=0.85, biz=0.30, tour=2.50, land=5, paxfee=14, tax=0, taxi=0.00, cost=0.90, fuel=1.05, hand=0.95, slots=None, slotFee=0),
 'FCO': dict(pop=4.3, income=0.85, biz=1.00, tour=1.70, land=7, paxfee=20, tax=7, taxi=0.05, cost=1.10, fuel=1.03, hand=1.00, slots=None, slotFee=0),
 'LIS': dict(pop=2.9, income=0.75, biz=0.80, tour=1.60, land=6, paxfee=18, tax=0, taxi=0.00, cost=0.85, fuel=1.04, hand=0.90, slots=None, slotFee=0),
}
REGION_ORDER = ['Europa', 'Nordamerika', 'Lateinamerika', 'Nahost & Afrika', 'Asien', 'Ozeanien']

import json
def build():
    aps, xs, rows = {}, {}, []
    rank = 0
    for line in AIRPORTS.strip().splitlines():
        c, name, lat, lon, cc, pop, biz, tour, pax = line.split('|')
        lat, lon, pop, biz, tour, pax = float(lat), float(lon), float(pop), float(biz), float(tour), float(pax)
        if c not in EXTRA: rank += 1
        C = COUNTRIES[cc]
        hub = max(0.8, min(1.3, 1 + (pax - 40) / 200))
        if c in OLD:
            o = OLD[c]
            ap = dict(name=name, lat=lat, lon=lon, pop=o['pop'], income=o['income'], biz=o['biz'], tour=o['tour'], land=o['land'], paxfee=o['paxfee'], tax=o['tax'], taxi=o['taxi'], country=cc)
            x = dict(cost=o['cost'], fuel=o['fuel'], hand=o['hand'], slots=o['slots'], slotFee=o['slotFee'])
        else:
            ap = dict(name=name, lat=lat, lon=lon, pop=pop, income=C[3], biz=biz, tour=tour, land=round(C[4] * hub, 1), paxfee=round(C[5] * hub), tax=C[6],
                      taxi=round(max(0, min(0.2, (pax - 30) / 350)), 2), country=cc)
            sl = SLOTS.get(c)
            x = dict(cost=round(C[9] * (1 + max(0, min(0.4, (pax - 30) / 150))), 2), fuel=C[8], hand=round(C[10] * hub, 2), slots=sl[0] if sl else None, slotFee=sl[1] if sl else 0)
        ap['rank'] = None if c in EXTRA else rank
        ap['pax'] = pax
        ap['region'] = C[2]
        aps[c] = ap; xs[c] = x
    countries = {k: dict(dat=v[0], nom=v[1], region=v[2], taxLong=v[7]) for k, v in COUNTRIES.items()}
    return aps, xs, countries
if __name__ == '__main__':
    aps, xs, countries = build()
    print(len(aps), sum(1 for a in aps.values() if a['rank']), max(a['rank'] or 0 for a in aps.values()))
    js = '  // @@AIRPORTS-BEGIN (generiert aus airports_data.py)\n'
    js += '  const AIRPORT_DATA = ' + json.dumps(aps, ensure_ascii=False, separators=(',', ':')) + ';\n'
    js += '  const AIRPORT_X_DATA = ' + json.dumps(xs, separators=(',', ':')) + ';\n'
    js += '  const COUNTRY_DATA = ' + json.dumps(countries, ensure_ascii=False, separators=(',', ':')) + ';\n'
    js += '  const SEASON_DATA = ' + json.dumps(SEASON, separators=(',', ':')) + ';\n'
    js += '  const REGION_ORDER = ' + json.dumps(REGION_ORDER, ensure_ascii=False) + ';\n'
    js += '  // @@AIRPORTS-END\n'
    open('airports_block.js', 'w').write(js)
