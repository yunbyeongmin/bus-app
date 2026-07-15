const API_KEY = process.env.EXPO_PUBLIC_GYEONGGI_API_KEY ?? '';
const BASE_ARRIVAL = 'https://apis.data.go.kr/6410000/busarrivalservice/v2';
const BASE_ROUTE   = 'https://apis.data.go.kr/6410000/busrouteservice/v2';
const BASE_LOCATION = 'https://apis.data.go.kr/6410000/buslocationservice/v2';
const BASE_STATION = 'https://apis.data.go.kr/6410000/busstationservice/v2';

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text.startsWith('{') && !text.startsWith('[')) {
    console.warn('API 응답 오류:', text.slice(0, 80));
    return null;
  }
  return JSON.parse(text);
}

export const STATIONS: Record<string, { name: string; x: number; y: number }> = {
  '223000142': { name: '포천시청앞', x: 127.2016167, y: 37.895 },
  '223000145': { name: '포천터미널', x: 127.2014167, y: 37.8950833 },
  '223000141': { name: '포천소방서', x: 127.2069333, y: 37.9009 },
  '223000143': { name: '신읍11통.시청별관', x: 127.1995167, y: 37.8929167 },
  '223000139': { name: '포천고등학교앞', x: 127.1961167, y: 37.8894 },
  '223000131': { name: '골든아파트앞', x: 127.20785, y: 37.9026667 },
  '223000140': { name: '가채리공원', x: 127.2091333, y: 37.9049 },
  '223000138': { name: '가채1통.오리동', x: 127.21255, y: 37.9109167 },
  '223000133': { name: '신북면행정복지센터', x: 127.22675, y: 37.9335333 },
  '223000119': { name: '선단1통.대진대학교', x: 127.1656333, y: 37.853 },
  '223000115': { name: '송우리터미널', x: 127.1479167, y: 37.82975 },
  '223000113': { name: '소흘읍행정복지센터', x: 127.13965, y: 37.82225 },
};

export function getNearestStation(lat: number, lng: number): string {
  let nearest = '';
  let minDist = Infinity;
  for (const [id, info] of Object.entries(STATIONS)) {
    const dist = Math.sqrt(Math.pow(info.x - lng, 2) + Math.pow(info.y - lat, 2));
    if (dist < minDist) { minDist = dist; nearest = id; }
  }
  return nearest;
}

export async function getBusArrival(stationId: string) {
  try {
    const url = `${BASE_ARRIVAL}/getBusArrivalListv2?serviceKey=${API_KEY}&stationId=${stationId}&format=json`;
    const res = await fetch(url);
    const json = await safeJson(res);
    const list = json?.response?.msgBody?.busArrivalList ?? [];
    return list.map((b: any) => ({ ...b, stationId: String(b.stationId ?? stationId) }));
  } catch (e) {
    return [];
  }
}

export async function getBusArrivalMulti(stationIds: string[]) {
  const results = await Promise.all(stationIds.map(id => getBusArrival(id)));
  const merged = results.flat();
  const seen = new Set();
  return merged
    .filter(b => String(b.routeId).startsWith('236'))   // 포천 노선만
    .sort((a, b) => (a.predictTime1 || 999) - (b.predictTime1 || 999))
    .filter(b => {
      if (seen.has(b.routeId)) return false;
      seen.add(b.routeId);
      return true;
    });
}

export async function getBusLocation(routeId: string, routeStations?: any[]) {
  try {
    const locationUrl = `${BASE_LOCATION}/getBusLocationListv2?serviceKey=${API_KEY}&routeId=${routeId}&format=json`;
    const locationRes = await fetch(locationUrl);
    const locationJson = await safeJson(locationRes);
    const locations = locationJson?.response?.msgBody?.busLocationList ?? [];
    const stations = routeStations ?? await getRouteStations(routeId);
    const stationById = new Map<string, any>(stations.map((s: any) => [String(s.stationId), s]));

    return locations.map((bus: any) => {
      const station = stationById.get(String(bus.stationId));
      return {
        ...bus,
        x: station?.x,
        y: station?.y,
        stationName: station?.stationName,
      };
    });
  } catch (e) {
    return [];
  }
}

export async function getRouteStations(routeId: string) {
  try {
    const url = `${BASE_ROUTE}/getBusRouteStationListv2?serviceKey=${API_KEY}&routeId=${routeId}&format=json`;
    const res = await fetch(url);
    const json = await safeJson(res);
    return json?.response?.msgBody?.busRouteStationList ?? [];
  } catch (e) {
    return [];
  }
}

export async function getRouteStationIds(routeId: string): Promise<string[]> {
  const list = await getRouteStations(routeId);
  return list.map((s: any) => String(s.stationId));
}

export async function searchStations(keyword: string) {
  try {
    const encoded = encodeURIComponent(keyword);
    const url = `${BASE_STATION}/getBusStationListv2?serviceKey=${API_KEY}&keyword=${encoded}&format=json`;
    const res = await fetch(url);
    const json = await safeJson(res);
    return json?.response?.msgBody?.busStationList ?? [];
  } catch (e) {
    return [];
  }
}

export async function searchBusRoute(keyword: string) {
  try {
    const encoded = encodeURIComponent(keyword);
    const url = `${BASE_ROUTE}/getBusRouteListv2?serviceKey=${API_KEY}&keyword=${encoded}&format=json`;
    const res = await fetch(url);
    const json = await safeJson(res);
    return json?.response?.msgBody?.busRouteList ?? [];
  } catch (e) {
    return [];
  }
}

export async function getStationById(stationId: string) {
  try {
    const url = `${BASE_STATION}/getBusStationv2?serviceKey=${API_KEY}&stationId=${stationId}&format=json`;
    const res = await fetch(url);
    const json = await res.json();
    return json.response?.msgBody?.busStationList?.[0] ?? null;
  } catch {
    return null;
  }
}
