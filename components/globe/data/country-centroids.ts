export const countryNames: Record<string, string> = {
  '004': 'Afghanistan', '008': 'Albania', '012': 'Algeria', '024': 'Angola',
  '032': 'Argentina', '051': 'Armenia', '036': 'Australia', '040': 'Austria',
  '031': 'Azerbaijan', '050': 'Bangladesh', '112': 'Belarus', '056': 'Belgium',
  '204': 'Benin', '064': 'Bhutan', '068': 'Bolivia', '070': 'Bosnia & Herz.',
  '072': 'Botswana', '076': 'Brazil', '096': 'Brunei', '100': 'Bulgaria',
  '854': 'Burkina Faso', '108': 'Burundi', '116': 'Cambodia', '120': 'Cameroon',
  '124': 'Canada', '140': 'C.A.R.', '148': 'Chad', '152': 'Chile',
  '156': 'China', '170': 'Colombia', '178': 'Congo', '180': 'DRC',
  '188': 'Costa Rica', '191': 'Croatia', '192': 'Cuba', '196': 'Cyprus',
  '203': 'Czechia', '208': 'Denmark', '262': 'Djibouti', '214': 'Dom. Rep.',
  '218': 'Ecuador', '818': 'Egypt', '222': 'El Salvador', '226': 'Eq. Guinea',
  '232': 'Eritrea', '233': 'Estonia', '231': 'Ethiopia', '238': 'Falkland Is.',
  '242': 'Fiji', '246': 'Finland', '250': 'France', '266': 'Gabon',
  '270': 'Gambia', '268': 'Georgia', '276': 'Germany', '288': 'Ghana',
  '300': 'Greece', '304': 'Greenland', '320': 'Guatemala', '324': 'Guinea',
  '624': 'Guinea-Bissau', '328': 'Guyana', '332': 'Haiti', '340': 'Honduras',
  '348': 'Hungary', '352': 'Iceland', '356': 'India', '360': 'Indonesia',
  '364': 'Iran', '368': 'Iraq', '372': 'Ireland', '376': 'Israel',
  '380': 'Italy', '384': "Côte d'Ivoire", '388': 'Jamaica', '392': 'Japan',
  '400': 'Jordan', '398': 'Kazakhstan', '404': 'Kenya', '408': 'N. Korea',
  '410': 'S. Korea', '414': 'Kuwait', '417': 'Kyrgyzstan', '418': 'Laos',
  '428': 'Latvia', '422': 'Lebanon', '426': 'Lesotho', '430': 'Liberia',
  '434': 'Libya', '440': 'Lithuania', '442': 'Luxembourg', '807': 'N. Macedonia',
  '450': 'Madagascar', '454': 'Malawi', '458': 'Malaysia', '466': 'Mali',
  '478': 'Mauritania', '484': 'Mexico', '498': 'Moldova', '496': 'Mongolia',
  '499': 'Montenegro', '504': 'Morocco', '508': 'Mozambique', '104': 'Myanmar',
  '516': 'Namibia', '524': 'Nepal', '528': 'Netherlands', '540': 'New Caledonia',
  '554': 'New Zealand', '558': 'Nicaragua', '562': 'Niger', '566': 'Nigeria',
  '578': 'Norway', '512': 'Oman', '586': 'Pakistan', '591': 'Panama',
  '598': 'Papua N.G.', '600': 'Paraguay', '604': 'Peru', '608': 'Philippines',
  '616': 'Poland', '620': 'Portugal', '630': 'Puerto Rico', '634': 'Qatar',
  '642': 'Romania', '643': 'Russia', '646': 'Rwanda', '682': 'Saudi Arabia',
  '686': 'Senegal', '688': 'Serbia', '694': 'Sierra Leone', '703': 'Slovakia',
  '705': 'Slovenia', '706': 'Somalia', '710': 'South Africa', '728': 'S. Sudan',
  '724': 'Spain', '144': 'Sri Lanka', '729': 'Sudan', '740': 'Suriname',
  '748': 'eSwatini', '752': 'Sweden', '756': 'Switzerland', '760': 'Syria',
  '158': 'Taiwan', '762': 'Tajikistan', '834': 'Tanzania', '764': 'Thailand',
  '626': 'Timor-Leste', '768': 'Togo', '780': 'Trinidad & T.', '788': 'Tunisia',
  '792': 'Turkey', '795': 'Turkmenistan', '800': 'Uganda', '804': 'Ukraine',
  '784': 'UAE', '826': 'UK', '840': 'USA', '858': 'Uruguay',
  '860': 'Uzbekistan', '862': 'Venezuela', '704': 'Vietnam',
  '887': 'Yemen', '894': 'Zambia', '716': 'Zimbabwe',
  '010': 'Antarctica', '-99': 'N. Cyprus', '275': 'Palestine',
  '732': 'W. Sahara', '090': 'Solomon Is.', '548': 'Vanuatu',
  '776': 'Tonga', '882': 'Samoa',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCentroid(feature: any): [number, number] {
  const coords: number[][] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extract = (c: any) => {
    if (typeof c[0] === 'number') coords.push(c)
    else c.forEach(extract)
  }
  extract(feature.geometry.coordinates)
  if (coords.length === 0) return [0, 0]
  let sumLng = 0, sumLat = 0
  for (const [lng, lat] of coords) {
    sumLng += lng
    sumLat += lat
  }
  return [sumLat / coords.length, sumLng / coords.length]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBBoxArea(feature: any): number {
  const coords: number[][] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extract = (c: any) => {
    if (typeof c[0] === 'number') coords.push(c)
    else c.forEach(extract)
  }
  extract(feature.geometry.coordinates)
  if (coords.length === 0) return 0
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return Math.abs(maxLng - minLng) * Math.abs(maxLat - minLat)
}

export interface CountryLabel {
  lat: number
  lng: number
  text: string
  area: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildCountryLabels(features: any[]): CountryLabel[] {
  return features
    .map((f) => {
      const name = countryNames[String(f.id)] || countryNames[f.id]
      if (!name) return null
      const [lat, lng] = getCentroid(f)
      const area = getBBoxArea(f)
      return { lat, lng, text: name, area }
    })
    .filter(Boolean) as CountryLabel[]
}
