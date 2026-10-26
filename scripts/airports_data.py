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
JNB|Johannesburg|-26.14|28.25|ZA|10|1.2|1.0|21
CPT|Kapstadt|-33.97|18.60|ZA|4.7|0.9|2.2|11
ADD|Addis Abeba|8.98|38.80|ET|5.5|0.9|0.6|13
NBO|Nairobi|-1.32|36.93|KE|5|1.0|1.3|9
LOS|Lagos|6.58|3.32|NG|20|1.1|0.5|8
ACC|Accra|5.61|-0.17|GH|5|0.9|0.8|3.5
CMN|Casablanca|33.37|-7.59|MA|4.3|1.0|1.0|10
RAK|Marrakesch|31.61|-8.04|MA|1.3|0.4|2.4|8
ALG|Algier|36.69|3.22|DZ|4|0.8|0.4|9
TUN|Tunis|36.85|10.23|TN|2.7|0.8|1.3|5
DSS|Dakar|14.67|-17.07|SN|3.5|0.8|0.9|3
DAR|Daressalam|-6.88|39.20|TZ|7|0.8|1.0|3
HRG|Hurghada|27.18|33.80|EG|0.3|0.2|2.6|9
MRU|Mauritius|-20.43|57.68|MU|1.3|0.6|2.6|4
BNE|Brisbane|-27.38|153.12|AU|2.6|1.0|1.4|23
PER|Perth|-31.94|115.97|AU|2.2|1.1|1.1|16
ADL|Adelaide|-34.95|138.53|AU|1.4|0.9|1.0|8.5
OOL|Gold Coast|-28.16|153.50|AU|0.7|0.3|2.4|6.5
CBR|Canberra|-35.31|149.20|AU|0.5|1.3|0.6|3.0
CNS|Cairns|-16.88|145.75|AU|0.25|0.3|2.6|5.0
HBA|Hobart|-42.84|147.51|AU|0.25|0.6|1.6|2.8
DRW|Darwin|-12.41|130.88|AU|0.15|0.7|1.2|2.0
TSV|Townsville|-19.25|146.77|AU|0.2|0.6|0.9|1.6
NTL|Newcastle (Australien)|-32.80|151.83|AU|0.6|0.7|0.8|1.3
MCY|Sunshine Coast|-26.60|153.09|AU|0.4|0.3|1.8|1.6
LST|Launceston|-41.55|147.21|AU|0.12|0.4|1.2|1.3
ASP|Alice Springs|-23.81|133.90|AU|0.03|0.3|1.8|0.6
AKL|Auckland|-37.01|174.79|NZ|1.7|1.1|1.4|19
WLG|Wellington|-41.33|174.81|NZ|0.45|1.2|0.9|5.5
CHC|Christchurch|-43.49|172.53|NZ|0.5|0.8|1.2|6.5
ZQN|Queenstown|-45.02|168.74|NZ|0.05|0.2|2.8|2.4
NAN|Nadi (Fidschi)|-17.76|177.44|FJ|0.3|0.3|2.6|2.3
NOU|Nouméa|-22.01|166.21|NC|0.27|0.6|1.4|0.5
PPT|Papeete (Tahiti)|-17.55|-149.61|PF|0.28|0.4|2.4|1.4
POM|Port Moresby|-9.44|147.22|PG|0.4|0.6|0.2|1.5
DPS|Bali|-8.75|115.17|ID|4.4|0.3|3.0|21
LED|Sankt Petersburg|59.80|30.26|RU|5.4|1.1|1.5|20
AER|Sotschi|43.45|39.96|RU|0.5|0.4|2.4|10
KZN|Kasan|55.61|49.28|RU|1.3|0.9|1.0|4.5
SVX|Jekaterinburg|56.74|60.80|RU|1.5|1.0|0.6|7
OVB|Nowosibirsk|55.01|82.65|RU|1.6|1.0|0.6|7.5
IKT|Irkutsk|52.27|104.39|RU|0.6|0.7|1.2|2.4
VVO|Wladiwostok|43.40|132.15|RU|0.6|0.8|1.0|2.5
KGD|Kaliningrad|54.89|20.59|RU|1.0|0.8|1.0|2.5
UFA|Ufa|54.56|55.87|RU|1.1|0.8|0.5|3.5
KJA|Krasnojarsk|56.17|92.49|RU|1.1|0.8|0.5|3.3
KHV|Chabarowsk|48.53|135.19|RU|0.6|0.7|0.5|2.3
MMK|Murmansk|68.78|32.75|RU|0.3|0.6|0.8|1.0
YKS|Jakutsk|62.09|129.77|RU|0.35|0.6|0.4|1.2
MRV|Mineralnyje Wody|44.23|43.08|RU|0.9|0.4|1.4|3.5
DUR|Durban|-29.61|31.12|ZA|3.5|0.9|1.4|6
ZNZ|Sansibar|-6.22|39.22|TZ|0.9|0.2|2.6|1.8
JRO|Kilimandscharo|-3.43|37.07|TZ|1.0|0.3|2.2|1.0
MBA|Mombasa|-4.03|39.59|KE|1.3|0.5|1.8|1.6
KGL|Kigali|-1.97|30.14|RW|1.6|0.8|0.9|1.0
EBB|Entebbe|0.04|32.44|UG|3.5|0.7|0.8|2.0
LUN|Lusaka|-15.33|28.45|ZM|3.0|0.7|0.5|1.5
HRE|Harare|-17.93|31.09|ZW|2.4|0.7|0.5|1.2
VFA|Victoria Falls|-18.10|25.84|ZW|0.05|0.1|3.0|0.4
MPM|Maputo|-25.92|32.57|MZ|2.5|0.7|0.8|1.0
WDH|Windhuk|-22.48|17.47|NA|0.5|0.7|1.6|1.0
LAD|Luanda|-8.86|13.23|AO|8.5|1.0|0.3|2.5
ABJ|Abidjan|5.26|-3.93|CI|5.5|1.0|0.6|2.5
DLA|Douala|4.01|9.72|CM|3.5|0.9|0.3|1.2
ABV|Abuja|9.01|7.26|NG|3.5|1.1|0.3|5
SEZ|Seychellen|-4.67|55.52|SC|0.1|0.3|2.8|1.0
TNR|Antananarivo|-18.80|47.48|MG|3.5|0.6|0.9|1.2
SSH|Scharm El-Scheich|27.98|34.39|EG|0.1|0.1|3.0|8
LXR|Luxor|25.67|32.71|EG|0.5|0.2|2.4|2.0
AGA|Agadir|30.38|-9.55|MA|1.0|0.3|2.4|2.5
GIG|Rio de Janeiro|-22.81|-43.25|BR|13|1.1|2.0|15
BSB|Brasília|-15.87|-47.92|BR|4.7|1.2|0.5|15
CNF|Belo Horizonte|-19.62|-43.97|BR|6|0.9|0.5|10
SSA|Salvador|-12.91|-38.33|BR|4|0.6|1.6|8
REC|Recife|-8.13|-34.92|BR|4|0.7|1.4|9
FOR|Fortaleza|-3.78|-38.53|BR|4|0.6|1.5|7
POA|Porto Alegre|-29.99|-51.17|BR|4.3|0.9|0.6|6.5
FLN|Florianópolis|-27.67|-48.55|BR|1.2|0.5|1.8|4.5
MAO|Manaus|-3.04|-60.05|BR|2.3|0.7|1.0|3.5
EZE|Buenos Aires|-34.82|-58.54|AR|15|1.2|1.6|13
COR|Córdoba (Argentinien)|-31.32|-64.21|AR|1.8|0.8|0.8|3.5
MDZ|Mendoza|-32.83|-68.79|AR|1.2|0.6|1.6|2.3
BRC|Bariloche|-41.15|-71.16|AR|0.15|0.2|2.6|2.0
MVD|Montevideo|-34.84|-56.03|UY|1.8|0.9|1.2|2.2
UIO|Quito|-0.13|-78.36|EC|2.8|0.9|1.2|5
GYE|Guayaquil|-2.16|-79.88|EC|3.0|0.9|0.9|4
MDE|Medellín|6.16|-75.42|CO|4.0|0.9|1.2|11
CTG|Cartagena|10.44|-75.51|CO|1.0|0.4|2.2|6
CLO|Cali|3.54|-76.38|CO|2.8|0.8|0.7|5.5
CUZ|Cusco|-13.54|-71.94|PE|0.5|0.2|2.8|3.5
ASU|Asunción|-25.24|-57.52|PY|2.5|0.8|0.4|1.2
VVI|Santa Cruz de la Sierra|-17.64|-63.14|BO|2.0|0.8|0.4|3.0
PTY|Panama-Stadt|9.07|-79.38|PA|2.0|1.1|1.0|18
YUL|Montréal|45.47|-73.74|CA|4.3|1.1|1.3|21
YYC|Calgary|51.13|-114.01|CA|1.6|1.1|0.9|18
YEG|Edmonton|53.31|-113.58|CA|1.5|1.0|0.6|8
YOW|Ottawa|45.32|-75.67|CA|1.5|1.3|0.8|5
YWG|Winnipeg|49.91|-97.24|CA|0.85|0.9|0.6|4.5
YHZ|Halifax|44.88|-63.51|CA|0.45|0.9|0.9|4.2
YQB|Québec|46.79|-71.39|CA|0.85|0.8|1.2|1.8
YYJ|Victoria (Kanada)|48.65|-123.43|CA|0.4|0.8|1.3|2.0
YXE|Saskatoon|52.17|-106.70|CA|0.33|0.8|0.4|1.5
YQR|Regina|50.43|-104.67|CA|0.26|0.8|0.3|1.2
YYT|St. John's|47.62|-52.75|CA|0.21|0.8|0.9|1.5
YXY|Whitehorse|60.71|-135.07|CA|0.04|0.5|1.4|0.4
YZF|Yellowknife|62.46|-114.44|CA|0.02|0.6|0.8|0.5
YFB|Iqaluit|63.76|-68.56|CA|0.008|0.6|0.4|0.15
HAJ|Hannover|52.46|9.69|DE|2.0|1.0|0.6|5.6
STR|Stuttgart|48.69|9.22|DE|2.7|1.3|0.7|9.0
CGN|Köln/Bonn|50.87|7.14|DE|3.0|1.1|0.8|9.8
NUE|Nürnberg|49.50|11.08|DE|1.3|1.0|0.8|3.9
LEJ|Leipzig/Halle|51.42|12.24|DE|1.1|0.8|0.6|2.2
BRE|Bremen|53.05|8.79|DE|1.0|0.9|0.6|2.1
BRU|Brüssel|50.90|4.48|BE|3.5|1.4|1.1|22
CRL|Brüssel-Charleroi|50.46|4.45|BE|1.5|0.6|0.9|10
OSL|Oslo|60.19|11.10|NO|2.0|1.3|1.0|28
BGO|Bergen|60.29|5.22|NO|0.6|1.0|1.2|6
ARN|Stockholm|59.65|17.92|SE|2.4|1.3|1.0|23
GOT|Göteborg|57.66|12.28|SE|1.0|1.0|0.8|5
HEL|Helsinki|60.32|24.96|FI|1.6|1.2|1.0|16
BLL|Billund|55.74|9.15|DK|0.8|0.7|1.2|3.8
WAW|Warschau|52.17|20.97|PL|3.2|1.1|0.9|21
KRK|Krakau|50.08|19.78|PL|1.5|0.8|1.4|11
GDN|Danzig|54.38|18.47|PL|1.1|0.7|1.0|6
PRG|Prag|50.10|14.26|CZ|2.2|1.1|1.6|14
BUD|Budapest|47.44|19.26|HU|3.0|1.0|1.4|17
OTP|Bukarest|44.57|26.08|RO|2.3|0.9|0.7|16
SOF|Sofia|42.70|23.41|BG|1.5|0.8|0.8|8
VAR|Warna|43.23|27.83|BG|0.5|0.4|1.6|2.5
BEG|Belgrad|44.82|20.31|RS|1.7|0.8|0.8|8
ZAG|Zagreb|45.74|16.07|HR|1.1|0.8|0.8|4
SPU|Split|43.54|16.30|HR|0.4|0.4|2.2|4
DBV|Dubrovnik|42.56|18.27|HR|0.2|0.4|2.4|3
KEF|Reykjavík|63.99|-22.62|IS|0.25|0.7|2.0|8
RIX|Riga|56.92|23.97|LV|1.0|0.8|1.0|7
VNO|Vilnius|54.63|25.29|LT|0.8|0.7|0.8|5
TLL|Tallinn|59.41|24.83|EE|0.6|0.9|1.1|3.2
MLA|Malta|35.86|14.48|MT|0.5|0.6|2.2|8
LCA|Larnaka|34.88|33.63|CY|0.9|0.7|2.0|9
SKG|Thessaloniki|40.52|22.97|GR|1.1|0.7|1.4|7
HER|Heraklion|35.34|25.18|GR|0.3|0.3|2.6|9
RHO|Rhodos|36.41|28.09|GR|0.1|0.2|2.6|6
CFU|Korfu|39.60|19.91|GR|0.1|0.2|2.4|3.5
MXP|Mailand-Malpensa|45.63|8.72|IT|7.0|1.4|1.3|29
LIN|Mailand-Linate|45.45|9.28|IT|4.0|1.4|0.8|10
BGY|Bergamo|45.67|9.70|IT|3.0|0.7|1.0|17
VCE|Venedig|45.51|12.35|IT|2.0|0.9|2.0|11
NAP|Neapel|40.88|14.29|IT|3.0|0.7|1.6|12.5
CTA|Catania|37.47|15.07|IT|1.5|0.5|1.8|12
PMO|Palermo|38.18|13.10|IT|1.2|0.5|1.7|8
BLQ|Bologna|44.53|11.29|IT|1.5|1.0|1.0|10
AGP|Málaga|36.67|-4.50|ES|1.5|0.6|2.4|24
ALC|Alicante|38.28|-0.56|ES|1.5|0.5|2.2|18
VLC|Valencia|39.49|-0.48|ES|2.0|0.8|1.4|10
SVQ|Sevilla|37.42|-5.90|ES|1.5|0.7|1.6|9
BIO|Bilbao|43.30|-2.91|ES|1.2|1.0|1.0|6.3
TFS|Teneriffa-Süd|28.04|-16.57|ES|0.5|0.3|2.6|12
LPA|Gran Canaria|27.93|-15.39|ES|0.9|0.5|2.4|15
ACE|Lanzarote|28.95|-13.61|ES|0.15|0.2|2.6|8.5
FUE|Fuerteventura|28.45|-13.86|ES|0.12|0.2|2.6|7
IBZ|Ibiza|38.87|1.37|ES|0.15|0.3|2.8|9
OPO|Porto|41.24|-8.68|PT|1.8|0.8|1.4|15
FAO|Faro|37.01|-7.97|PT|0.5|0.3|2.4|10
FNC|Madeira|32.70|-16.77|PT|0.3|0.3|2.2|4.5
NCE|Nizza|43.66|7.22|FR|1.0|0.9|2.2|14.8
MRS|Marseille|43.44|5.21|FR|1.8|0.9|1.4|10
LYS|Lyon|45.73|5.08|FR|2.3|1.1|1.0|10
TLS|Toulouse|43.63|1.36|FR|1.4|1.1|0.9|7.5
BOD|Bordeaux|44.83|-0.72|FR|1.2|0.9|1.1|6.8
NTE|Nantes|47.15|-1.61|FR|1.0|0.8|0.9|7
GVA|Genf|46.24|6.11|CH|1.0|1.6|1.3|17.8
BSL|Basel|47.60|7.53|CH|1.0|1.2|0.8|8.9
STN|London-Stansted|51.88|0.24|GB|4.0|0.6|1.0|29
LTN|London-Luton|51.87|-0.37|GB|3.0|0.6|0.9|16
EDI|Edinburgh|55.95|-3.37|GB|1.4|1.1|1.6|14
GLA|Glasgow|55.87|-4.43|GB|1.8|0.9|1.0|7
BHX|Birmingham|52.45|-1.75|GB|3.0|1.0|0.8|12
BRS|Bristol|51.38|-2.72|GB|1.3|0.8|0.8|9
EIN|Eindhoven|51.45|5.37|NL|1.0|0.8|0.6|7
SZG|Salzburg|47.79|13.00|AT|0.5|0.6|1.8|2
ADB|Izmir|38.29|27.16|TR|3.0|0.8|1.3|12.5
ESB|Ankara|40.13|32.99|TR|5.0|1.0|0.6|13
DLM|Dalaman|36.71|28.79|TR|0.2|0.2|2.6|5.5
BJV|Bodrum|37.25|27.66|TR|0.2|0.2|2.6|4.5
TLV|Tel Aviv|32.01|34.89|IL|4.5|1.3|1.2|22
AMM|Amman|31.72|35.99|JO|4.0|0.8|1.0|9
BEY|Beirut|33.82|35.49|LB|2.4|0.8|1.0|7
KWI|Kuwait|29.24|47.97|KW|4.3|1.1|0.4|15
BAH|Bahrain|26.27|50.63|BH|1.5|1.1|0.7|9
MCT|Maskat|23.59|58.28|OM|1.7|0.9|1.2|13
DMM|Dammam|26.47|49.80|SA|3.0|1.0|0.3|11
MED|Medina|24.55|39.71|SA|1.5|0.4|1.5|9
SHJ|Schardscha|25.33|55.52|AE|1.8|0.6|1.0|17
IKA|Teheran|35.42|51.15|IR|15|0.8|0.6|9
CMB|Colombo|7.18|79.88|LK|5.0|0.8|1.4|10
MLE|Malé|4.19|73.53|MV|0.5|0.4|3.0|5
KTM|Kathmandu|27.70|85.36|NP|3.0|0.5|1.5|7
DAC|Dhaka|23.84|90.40|BD|21|0.8|0.5|12
KHI|Karatschi|24.91|67.16|PK|17|0.9|0.4|9
LHE|Lahore|31.52|74.40|PK|13|0.7|0.5|6
ISB|Islamabad|33.55|72.83|PK|2.5|0.9|0.5|5
CCU|Kolkata|22.65|88.45|IN|15|0.9|0.8|22
MAA|Chennai|12.99|80.17|IN|11|1.0|0.8|22
COK|Kochi|10.15|76.40|IN|3.0|0.6|1.4|11
GOI|Goa|15.38|73.83|IN|1.5|0.3|2.4|8
AMD|Ahmedabad|23.07|72.63|IN|8.0|0.9|0.6|12
PNQ|Pune|18.58|73.92|IN|7.0|1.0|0.6|9
HKT|Phuket|8.11|98.31|TH|0.5|0.3|2.8|18
CNX|Chiang Mai|18.77|98.96|TH|1.2|0.4|2.0|8
PEN|Penang|5.30|100.28|MY|1.8|0.8|1.6|8
BKI|Kota Kinabalu|5.94|116.05|MY|1.0|0.5|1.6|9
CEB|Cebu|10.31|123.98|PH|3.0|0.7|1.8|11
DAD|Da Nang|16.04|108.20|VN|1.2|0.5|2.2|14
PQC|Phu Quoc|10.17|103.99|VN|0.2|0.2|2.6|5
PNH|Phnom Penh|11.55|104.84|KH|2.3|0.6|1.2|5.5
RGN|Rangun|16.91|96.13|MM|7.0|0.5|0.6|5
MFM|Macau|22.15|113.59|MO|0.7|0.8|2.4|7
FUK|Fukuoka|33.59|130.45|JP|5.0|1.0|1.2|24
CTS|Sapporo|42.78|141.69|JP|2.5|0.8|1.8|23
OKA|Okinawa|26.20|127.65|JP|1.4|0.4|2.4|21
NGO|Nagoya|34.86|136.81|JP|9.0|1.2|0.8|10
ITM|Osaka-Itami|34.79|135.44|JP|10|1.3|0.8|15
GMP|Seoul-Gimpo|37.56|126.79|KR|10|1.2|0.8|24
PUS|Busan|35.18|128.94|KR|3.4|0.9|1.3|15
DLC|Dalian|38.97|121.54|CN|6.0|0.9|0.9|18
SHE|Shenyang|41.64|123.48|CN|8.0|0.8|0.6|19
HRB|Harbin|45.62|126.25|CN|10|0.7|1.0|20
TSN|Tianjin|39.12|117.35|CN|13|1.0|0.6|19
CGO|Zhengzhou|34.52|113.84|CN|12|0.8|0.6|28
NNG|Nanning|22.61|108.17|CN|8.0|0.7|0.9|16
HAK|Haikou|19.93|110.46|CN|2.5|0.5|2.0|24
SYX|Sanya|18.30|109.41|CN|1.0|0.3|2.8|22
FOC|Fuzhou|25.93|119.66|CN|7.0|0.8|0.8|15
URC|Ürümqi|43.91|87.47|CN|4.0|0.7|1.0|25
ULN|Ulaanbaatar|47.65|106.82|MN|1.6|0.6|0.9|2.4
ALA|Almaty|43.35|77.04|KZ|2.2|0.9|0.8|9
NQZ|Astana|51.02|71.47|KZ|1.4|1.0|0.5|6
TAS|Taschkent|41.26|69.28|UZ|3.0|0.7|0.8|6
GYD|Baku|40.47|50.05|AZ|2.5|0.9|0.9|5
TBS|Tiflis|41.67|44.95|GE|1.2|0.6|1.3|4
EVN|Jerewan|40.15|44.40|AM|1.1|0.6|1.0|5
HNL|Honolulu|21.32|-157.92|US|1.0|0.6|2.8|21
OGG|Maui|20.90|-156.43|US|0.17|0.3|3.0|7
ANC|Anchorage|61.17|-149.99|US|0.4|0.8|1.4|5.5
AUS|Austin|30.19|-97.67|US|2.4|1.3|1.0|22
BNA|Nashville|36.12|-86.68|US|2.0|1.1|1.4|24
MSY|New Orleans|29.99|-90.26|US|1.3|0.8|2.0|14
SAT|San Antonio|29.53|-98.47|US|2.6|0.8|1.1|10
STL|St. Louis|38.75|-90.37|US|2.8|1.0|0.7|15
MCI|Kansas City|39.30|-94.71|US|2.2|0.9|0.6|11
PDX|Portland|45.59|-122.60|US|2.5|1.1|1.0|18
SJC|San José|37.36|-121.93|US|2.0|1.6|0.6|11
OAK|Oakland|37.72|-122.22|US|2.5|0.9|0.7|11
SMF|Sacramento|38.70|-121.59|US|2.4|0.9|0.6|13
SNA|Orange County|33.68|-117.87|US|3.2|1.1|1.1|11
RDU|Raleigh-Durham|35.88|-78.79|US|2.0|1.1|0.6|14
MDW|Chicago-Midway|41.79|-87.75|US|4.0|0.8|0.7|22
DAL|Dallas-Love|32.85|-96.85|US|4.0|1.0|0.6|16
HOU|Houston-Hobby|29.65|-95.28|US|3.0|0.8|0.6|13
CLE|Cleveland|41.41|-81.85|US|2.0|0.9|0.5|10
PIT|Pittsburgh|40.49|-80.23|US|2.3|1.0|0.6|10
IND|Indianapolis|39.72|-86.29|US|2.0|0.9|0.5|9.5
CMH|Columbus|39.99|-82.89|US|2.1|0.9|0.5|9.5
SJU|San Juan|18.44|-66.00|PR|2.5|0.7|2.0|13
PUJ|Punta Cana|18.57|-68.36|DO|0.2|0.2|3.0|9
SDQ|Santo Domingo|18.43|-69.67|DO|3.5|0.6|1.2|5
MBJ|Montego Bay|18.50|-77.91|JM|0.3|0.2|2.8|5
NAS|Nassau|25.04|-77.47|BS|0.3|0.5|2.6|4.5
HAV|Havanna|22.99|-82.41|CU|2.1|0.4|1.8|3
SJO|San José (Costa Rica)|9.99|-84.20|CR|2.2|0.7|1.8|6
LIR|Liberia (Costa Rica)|10.59|-85.54|CR|0.2|0.2|2.6|2
GUA|Guatemala-Stadt|14.58|-90.53|GT|3.0|0.7|0.9|3
SAL|San Salvador|13.44|-89.06|SV|2.0|0.6|0.8|4
AUA|Aruba|12.50|-70.02|AW|0.1|0.3|3.0|2.6
BGI|Barbados|13.07|-59.49|BB|0.3|0.4|2.6|2.4
GDL|Guadalajara|20.52|-103.31|MX|5.3|0.9|1.0|17
MTY|Monterrey|25.78|-100.11|MX|5.3|1.2|0.6|12
TIJ|Tijuana|32.54|-116.97|MX|2.2|0.6|0.6|12
SJD|Los Cabos|23.15|-109.72|MX|0.4|0.3|2.8|7
PVR|Puerto Vallarta|20.68|-105.25|MX|0.5|0.3|2.6|6
CCS|Caracas|10.60|-66.99|VE|5.0|0.6|0.6|3
TNG|Tanger|35.73|-5.92|MA|1.2|0.5|1.4|2.5
"""
EXTRA = {'VIE', 'BER', 'DUS', 'HAM'} | {'JNB','CPT','ADD','NBO','LOS','ACC','CMN','RAK','ALG','TUN','DSS','DAR','HRG','MRU'}   # nicht in den Top 100, aus der Europa-Version übernommen
# v0.12: Erweiterung Australien/Ozeanien, Russland, Afrika, Südamerika, Kanada (Passagiere Mio./Jahr gerundet, Stand 2019/2024)
EXTRA |= {l.split('|')[0] for l in AIRPORTS.strip().splitlines()[AIRPORTS.strip().splitlines().index(next(x for x in AIRPORTS.strip().splitlines() if x.startswith('BNE|'))):]}
# Asiatisches Russland: eigene Region (Inlandsflüge bleiben trotzdem Inland, siehe INTERCONT im Kern)
REGION_OVERRIDE = {'OVB': 'Asien', 'IKT': 'Asien', 'VVO': 'Asien', 'KJA': 'Asien', 'KHV': 'Asien', 'YKS': 'Asien'}

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
 'AE': ('den Vereinigten Arabischen Emiraten', 'VAE', 'Nahost', 1.20, 5, 20, 10, 10, 0.9, 1.2, 1.0),
 'QA': ('Katar', 'Katar', 'Nahost', 1.40, 5, 20, 10, 10, 0.9, 1.2, 1.0),
 'SA': ('Saudi-Arabien', 'Saudi-Arabien', 'Nahost', 0.80, 5, 18, 12, 20, 0.85, 1.0, 0.9),
 'EG': ('Ägypten', 'Ägypten', 'Afrika', 0.20, 4, 15, 10, 25, 1.0, 0.6, 0.7),
 'ZA': ('Südafrika', 'Südafrika', 'Afrika', 0.30, 5, 18, 10, 15, 1.05, 0.75, 0.75),
 'ET': ('Äthiopien', 'Äthiopien', 'Afrika', 0.08, 4, 12, 5, 10, 1.10, 0.55, 0.6),
 'KE': ('Kenia', 'Kenia', 'Afrika', 0.12, 4, 15, 8, 12, 1.12, 0.6, 0.65),
 'NG': ('Nigeria', 'Nigeria', 'Afrika', 0.12, 5, 20, 10, 20, 1.25, 0.7, 0.75),
 'GH': ('Ghana', 'Ghana', 'Afrika', 0.14, 5, 18, 8, 15, 1.20, 0.65, 0.7),
 'MA': ('Marokko', 'Marokko', 'Afrika', 0.22, 4, 14, 5, 10, 1.05, 0.6, 0.65),
 'DZ': ('Algerien', 'Algerien', 'Afrika', 0.25, 4, 12, 5, 10, 0.90, 0.6, 0.65),
 'TN': ('Tunesien', 'Tunesien', 'Afrika', 0.25, 4, 12, 5, 10, 1.00, 0.6, 0.65),
 'SN': ('dem Senegal', 'Senegal', 'Afrika', 0.10, 5, 18, 8, 15, 1.15, 0.6, 0.7),
 'TZ': ('Tansania', 'Tansania', 'Afrika', 0.08, 4, 14, 8, 12, 1.15, 0.55, 0.6),
 'MU': ('Mauritius', 'Mauritius', 'Afrika', 0.45, 6, 20, 10, 15, 1.10, 0.8, 0.8),
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
 'AU': ('Australien', 'Australien', 'Ozeanien', 1.25, 8, 25, 10, 40, 1.05, 1.3, 1.2),
 'NZ': ('Neuseeland', 'Neuseeland', 'Ozeanien', 1.05, 7, 22, 12, 20, 1.08, 1.2, 1.1),
 'FJ': ('Fidschi', 'Fidschi', 'Ozeanien', 0.25, 6, 25, 30, 30, 1.15, 0.8, 0.8),
 'NC': ('Neukaledonien', 'Neukaledonien', 'Ozeanien', 0.90, 8, 25, 10, 10, 1.15, 1.2, 1.1),
 'PF': ('Französisch-Polynesien', 'Franz.-Polynesien', 'Ozeanien', 0.80, 8, 25, 10, 10, 1.15, 1.2, 1.1),
 'PG': ('Papua-Neuguinea', 'Papua-Neuguinea', 'Ozeanien', 0.12, 6, 20, 10, 15, 1.20, 0.8, 0.8),
 'AR': ('Argentinien', 'Argentinien', 'Lateinamerika', 0.45, 5, 20, 15, 40, 1.10, 0.8, 0.8),
 'UY': ('Uruguay', 'Uruguay', 'Lateinamerika', 0.60, 5, 25, 15, 30, 1.10, 0.85, 0.85),
 'EC': ('Ecuador', 'Ecuador', 'Lateinamerika', 0.35, 4, 25, 12, 30, 1.05, 0.75, 0.8),
 'PY': ('Paraguay', 'Paraguay', 'Lateinamerika', 0.30, 4, 20, 10, 20, 1.10, 0.7, 0.75),
 'BO': ('Bolivien', 'Bolivien', 'Lateinamerika', 0.20, 4, 15, 8, 20, 1.10, 0.65, 0.7),
 'PA': ('Panama', 'Panama', 'Lateinamerika', 0.60, 5, 20, 10, 40, 1.05, 0.85, 0.85),
 'AO': ('Angola', 'Angola', 'Afrika', 0.15, 6, 25, 10, 20, 1.00, 0.75, 0.8),
 'RW': ('Ruanda', 'Ruanda', 'Afrika', 0.08, 5, 20, 8, 15, 1.15, 0.6, 0.65),
 'UG': ('Uganda', 'Uganda', 'Afrika', 0.07, 5, 20, 8, 15, 1.15, 0.6, 0.65),
 'ZM': ('Sambia', 'Sambia', 'Afrika', 0.10, 5, 20, 8, 15, 1.20, 0.6, 0.65),
 'ZW': ('Simbabwe', 'Simbabwe', 'Afrika', 0.10, 5, 25, 10, 15, 1.20, 0.65, 0.7),
 'MZ': ('Mosambik', 'Mosambik', 'Afrika', 0.06, 5, 20, 8, 15, 1.20, 0.6, 0.65),
 'NA': ('Namibia', 'Namibia', 'Afrika', 0.30, 5, 20, 8, 15, 1.15, 0.7, 0.75),
 'CI': ('der Elfenbeinküste', 'Elfenbeinküste', 'Afrika', 0.12, 5, 22, 10, 20, 1.15, 0.65, 0.7),
 'CM': ('Kamerun', 'Kamerun', 'Afrika', 0.08, 5, 22, 10, 20, 1.20, 0.65, 0.7),
 'SC': ('den Seychellen', 'Seychellen', 'Afrika', 0.70, 6, 25, 10, 15, 1.15, 0.9, 0.9),
 'MG': ('Madagaskar', 'Madagaskar', 'Afrika', 0.05, 5, 20, 8, 15, 1.20, 0.6, 0.65),
 'BE': ('Belgien', 'Belgien', 'Europa', 1.10, 8, 25, 10, 10, 1.02, 1.2, 1.1),
 'NO': ('Norwegen', 'Norwegen', 'Europa', 1.50, 8, 25, 8, 8, 1.03, 1.5, 1.3),
 'SE': ('Schweden', 'Schweden', 'Europa', 1.20, 7, 22, 7, 25, 1.03, 1.3, 1.2),
 'FI': ('Finnland', 'Finnland', 'Europa', 1.10, 7, 22, 0, 0, 1.03, 1.2, 1.1),
 'PL': ('Polen', 'Polen', 'Europa', 0.60, 5, 15, 0, 0, 1.02, 0.8, 0.8),
 'CZ': ('Tschechien', 'Tschechien', 'Europa', 0.70, 6, 18, 0, 0, 1.02, 0.85, 0.85),
 'HU': ('Ungarn', 'Ungarn', 'Europa', 0.55, 5, 18, 5, 5, 1.03, 0.8, 0.8),
 'RO': ('Rumänien', 'Rumänien', 'Europa', 0.45, 5, 15, 0, 0, 1.03, 0.7, 0.75),
 'BG': ('Bulgarien', 'Bulgarien', 'Europa', 0.35, 5, 15, 0, 0, 1.03, 0.65, 0.7),
 'RS': ('Serbien', 'Serbien', 'Europa', 0.30, 5, 15, 0, 0, 1.03, 0.65, 0.7),
 'HR': ('Kroatien', 'Kroatien', 'Europa', 0.55, 6, 18, 0, 0, 1.04, 0.8, 0.8),
 'IS': ('Island', 'Island', 'Europa', 1.30, 8, 25, 0, 0, 1.10, 1.4, 1.3),
 'LV': ('Lettland', 'Lettland', 'Europa', 0.55, 5, 15, 0, 0, 1.03, 0.75, 0.75),
 'LT': ('Litauen', 'Litauen', 'Europa', 0.60, 5, 15, 0, 0, 1.03, 0.75, 0.75),
 'EE': ('Estland', 'Estland', 'Europa', 0.65, 5, 15, 0, 0, 1.03, 0.8, 0.8),
 'MT': ('Malta', 'Malta', 'Europa', 0.80, 6, 18, 0, 0, 1.05, 0.9, 0.9),
 'CY': ('Zypern', 'Zypern', 'Europa', 0.80, 6, 20, 0, 0, 1.05, 0.9, 0.9),
 'IL': ('Israel', 'Israel', 'Nahost', 1.00, 6, 20, 10, 15, 1.05, 1.2, 1.1),
 'JO': ('Jordanien', 'Jordanien', 'Nahost', 0.25, 5, 20, 10, 25, 1.05, 0.7, 0.75),
 'LB': ('dem Libanon', 'Libanon', 'Nahost', 0.20, 5, 20, 10, 25, 1.10, 0.7, 0.75),
 'KW': ('Kuwait', 'Kuwait', 'Nahost', 0.90, 5, 15, 5, 5, 0.85, 1.0, 0.9),
 'BH': ('Bahrain', 'Bahrain', 'Nahost', 0.80, 5, 18, 5, 5, 0.85, 1.0, 0.9),
 'OM': ('dem Oman', 'Oman', 'Nahost', 0.60, 5, 18, 5, 10, 0.85, 0.9, 0.85),
 'IR': ('dem Iran', 'Iran', 'Nahost', 0.15, 3, 8, 5, 10, 0.70, 0.5, 0.55),
 'LK': ('Sri Lanka', 'Sri Lanka', 'Asien', 0.12, 4, 15, 8, 20, 1.15, 0.6, 0.6),
 'MV': ('den Malediven', 'Malediven', 'Asien', 0.40, 6, 25, 15, 30, 1.20, 0.9, 0.9),
 'NP': ('Nepal', 'Nepal', 'Asien', 0.05, 4, 12, 5, 10, 1.20, 0.55, 0.55),
 'BD': ('Bangladesch', 'Bangladesch', 'Asien', 0.08, 4, 10, 5, 15, 1.15, 0.55, 0.55),
 'PK': ('Pakistan', 'Pakistan', 'Asien', 0.06, 4, 10, 5, 15, 1.15, 0.55, 0.55),
 'KH': ('Kambodscha', 'Kambodscha', 'Asien', 0.08, 4, 15, 5, 15, 1.15, 0.55, 0.6),
 'MM': ('Myanmar', 'Myanmar', 'Asien', 0.05, 4, 12, 5, 10, 1.20, 0.55, 0.55),
 'MO': ('Macau', 'Macau', 'Asien', 1.40, 6, 18, 10, 10, 1.05, 1.2, 1.1),
 'MN': ('der Mongolei', 'Mongolei', 'Asien', 0.15, 5, 15, 5, 10, 1.20, 0.6, 0.65),
 'KZ': ('Kasachstan', 'Kasachstan', 'Asien', 0.35, 4, 12, 5, 10, 0.95, 0.65, 0.7),
 'UZ': ('Usbekistan', 'Usbekistan', 'Asien', 0.08, 4, 12, 5, 10, 1.00, 0.55, 0.6),
 'AZ': ('Aserbaidschan', 'Aserbaidschan', 'Asien', 0.20, 4, 15, 5, 10, 0.90, 0.65, 0.7),
 'GE': ('Georgien', 'Georgien', 'Asien', 0.20, 4, 15, 5, 10, 1.05, 0.6, 0.65),
 'AM': ('Armenien', 'Armenien', 'Asien', 0.20, 4, 15, 5, 10, 1.05, 0.6, 0.65),
 'PR': ('Puerto Rico', 'Puerto Rico', 'Lateinamerika', 0.70, 4, 14, 18, 40, 1.00, 1.0, 1.0),
 'DO': ('der Dominikanischen Republik', 'Dominik. Rep.', 'Lateinamerika', 0.30, 5, 20, 15, 30, 1.10, 0.75, 0.8),
 'JM': ('Jamaika', 'Jamaika', 'Lateinamerika', 0.20, 5, 25, 15, 30, 1.15, 0.8, 0.8),
 'BS': ('den Bahamas', 'Bahamas', 'Lateinamerika', 0.90, 6, 30, 20, 30, 1.15, 1.1, 1.0),
 'CU': ('Kuba', 'Kuba', 'Lateinamerika', 0.10, 5, 20, 15, 25, 1.20, 0.7, 0.75),
 'CR': ('Costa Rica', 'Costa Rica', 'Lateinamerika', 0.40, 5, 25, 15, 30, 1.10, 0.8, 0.8),
 'GT': ('Guatemala', 'Guatemala', 'Lateinamerika', 0.18, 4, 20, 10, 25, 1.10, 0.7, 0.75),
 'SV': ('El Salvador', 'El Salvador', 'Lateinamerika', 0.15, 4, 20, 10, 25, 1.10, 0.7, 0.75),
 'AW': ('Aruba', 'Aruba', 'Lateinamerika', 0.90, 6, 30, 15, 30, 1.15, 1.1, 1.0),
 'BB': ('Barbados', 'Barbados', 'Lateinamerika', 0.60, 6, 30, 15, 30, 1.15, 1.0, 1.0),
 'VE': ('Venezuela', 'Venezuela', 'Lateinamerika', 0.10, 4, 15, 10, 25, 0.80, 0.6, 0.65),
}
# Slotkoordinierte Flughäfen: (zusätzliche Slots, Entgelt je Bewegung)
SLOTS = {
 'LGW': (6, 150), 'JFK': (6, 300), 'LGA': (4, 250), 'EWR': (6, 200), 'DCA': (4, 200), 'HND': (4, 300), 'NRT': (8, 120),
 'PEK': (6, 150), 'PKX': (10, 80), 'PVG': (8, 120), 'SHA': (4, 150), 'CAN': (8, 100), 'SZX': (8, 80), 'HKG': (6, 200),
 'SIN': (8, 150), 'ICN': (8, 100), 'TPE': (8, 80), 'BKK': (8, 100), 'DXB': (8, 150), 'DOH': (10, 100), 'IST': (8, 100),
 'ORY': (6, 120), 'MAD': (8, 120), 'DUB': (8, 80), 'ZRH': (6, 150), 'SYD': (6, 150), 'MEX': (4, 100), 'GRU': (8, 80),
 'BOM': (4, 100), 'DEL': (8, 80), 'CGK': (8, 60), 'MNL': (6, 80), 'KUL': (10, 60),
 'BRU': (8, 100), 'LIN': (4, 120), 'GVA': (6, 120), 'TLV': (8, 80), 'GMP': (6, 120), 'ITM': (4, 150), 'FUK': (6, 80), 'MXP': (8, 80), 'STN': (6, 80),
}
# Ferienziele mit Saisonprofil
SEASON = {'PMI': 'island', 'BCN': 'sun', 'FCO': 'sun', 'LIS': 'sun', 'AYT': 'island', 'CJU': 'sun', 'ATH': 'sun',
          'CUN': 'winter_sun', 'MCO': 'winter_sun', 'MIA': 'winter_sun', 'FLL': 'winter_sun', 'TPA': 'winter_sun', 'LAS': 'city',
          'BKK': 'winter_sun', 'DMK': 'winter_sun', 'DXB': 'winter_sun', 'AUH': 'winter_sun', 'SYD': 'sun', 'MEL': 'sun', 'SAN': 'sun', 'CAI': 'winter_sun',
          'HRG': 'winter_sun', 'RAK': 'winter_sun', 'MRU': 'winter_sun', 'CPT': 'winter_sun', 'TUN': 'sun',
          'OOL': 'sun', 'HBA': 'sun', 'GIG': 'sun', 'FLN': 'sun', 'AER': 'sun', 'SSH': 'winter_sun', 'LXR': 'winter_sun', 'AGA': 'winter_sun', 'CTG': 'winter_sun',
          'HER': 'island', 'RHO': 'island', 'CFU': 'island', 'IBZ': 'island', 'TFS': 'winter_sun', 'LPA': 'winter_sun', 'ACE': 'winter_sun', 'FUE': 'winter_sun', 'FAO': 'sun', 'FNC': 'winter_sun', 'MLA': 'sun',
          'LCA': 'sun', 'SPU': 'island', 'DBV': 'sun', 'DLM': 'island', 'BJV': 'island', 'VAR': 'island', 'AGP': 'sun', 'ALC': 'sun', 'NCE': 'sun', 'HKT': 'winter_sun', 'MLE': 'winter_sun', 'PUJ': 'winter_sun',
          'MBJ': 'winter_sun', 'NAS': 'winter_sun', 'AUA': 'winter_sun', 'BGI': 'winter_sun', 'SJD': 'winter_sun', 'PVR': 'winter_sun', 'SYX': 'winter_sun', 'OKA': 'sun', 'GOI': 'winter_sun', 'PQC': 'winter_sun', 'KEF': 'sun', 'HNL': 'sun', 'OGG': 'sun'}
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
REGION_ORDER = ['Europa', 'Nordamerika', 'Lateinamerika', 'Nahost', 'Afrika', 'Asien', 'Ozeanien']

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
        ap['region'] = REGION_OVERRIDE.get(c, C[2])
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
    # direkt in den Kern einsetzen (zwischen den Markern)
    import re, os
    eng = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared', 'engine.cjs')
    src = open(eng).read()
    a, b = src.index('  // @@AIRPORTS-BEGIN'), src.index('  // @@AIRPORTS-END\n') + len('  // @@AIRPORTS-END\n')
    open(eng, 'w').write(src[:a] + js + src[b:])
    print('engine.cjs aktualisiert')
