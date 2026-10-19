import pandas as pd
import json
import os
import re
from datetime import datetime


def parse_duration_minutes(dur_str):
    if not isinstance(dur_str, str):
        return 0.0
    m = re.match(r'(\d+)d\.(\d+)h(\d+)m', dur_str.strip())
    if not m:
        return 0.0
    days, hours, mins = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return days * 1440 + hours * 60 + mins


def normalize_code(code):
    if not isinstance(code, str):
        return None
    return code.replace(' ', '').upper().strip()


CLUSTER_SIGLA = {
    'RIO DE JANEIRO': 'RJ_ES',
    'ESPIRITO SANTO': 'RJ_ES',
    'MINAS GERAIS':   'MG',
    'NORDESTE':       'NE',
    'NORTE':          'NO',
    'CENTRO OESTE':   'CO',
    'BAHIA/SERGIPE':  'BA_SE',
    'SUL PARANA/SC':  'PR_SC',
    'SAO PAULO':      'SPC',
    'SPI':            'SPI',
    'NOC':            'NOC',
    'RS':             'RS',
    'Unknown':        'N/A',
}

AGING_BUCKETS = [
    ('<4h',    0,        4 * 60),
    ('4h-8h',  4 * 60,   8 * 60),
    ('8h-24h', 8 * 60,  24 * 60),
    ('24h-72h',24 * 60, 72 * 60),
    ('72h-7d', 72 * 60,  7 * 1440),
    ('7d-30d', 7 * 1440,30 * 1440),
    ('>30d',   30 * 1440, float('inf')),
]


def get_aging_bucket(minutes):
    for label, lo, hi in AGING_BUCKETS:
        if lo <= minutes < hi:
            return label
    return '>30d'


def classify_area(descricao, tipo_ral):
    text = (str(descricao) + ' ' + str(tipo_ral)).upper()
    if 'RUP CABO' in text or ('CABO' in text and 'RUP' in text):
        return 'REDE EXTERNA'
    if 'SWAP' in text:
        return 'SWAP'
    if 'INTERNO' in text or 'INTERNA' in text:
        return 'REDE INTERNA'
    if 'INFRA' in text or 'ENERGIA' in text or 'AR COND' in text:
        return 'INFRAESTRUTURA'
    if 'NOC' in text or 'SOFTWARE' in text:
        return 'NOC'
    return 'DEMAIS AREAS'


def build_stats(rows, cluster_by_code):
    """Build the full stats dict from a list of (dur_str, descricao, tipo_ral, code) rows."""
    total = len(rows)
    if total == 0:
        return {
            'kpis': {'pendentes': 0,'ral_gt8h': 0,'pct_gt8h': 0,'ral_gt24h': 0,'pct_gt24h': 0,'ral_gt7d': 0,'pct_gt7d': 0,'ral_gt30d': 0,'pct_gt30d': 0},
            'aging': [{'label': lb,'count': 0,'pct': 0} for lb,_,_ in AGING_BUCKETS],
            'areas': [],
            'rankings': {'byTotal': [], 'byPct8h': [], 'byPct24h': []},
        }

    count_gt8h = count_gt24h = count_gt7d = count_gt30d = 0
    aging_counts = {b[0]: 0 for b in AGING_BUCKETS}
    area_counts = {}
    cluster_total = {}
    cluster_gt8h = {}
    cluster_gt24h = {}

    for dur_str, descricao, tipo_ral, code in rows:
        minutes = parse_duration_minutes(dur_str)
        norm_code = normalize_code(code)
        raw_cluster = cluster_by_code.get(norm_code, 'Unknown')
        sigla = CLUSTER_SIGLA.get(raw_cluster, raw_cluster[:6] if raw_cluster else 'N/A')

        if minutes >= 8 * 60:    count_gt8h  += 1
        if minutes >= 24 * 60:   count_gt24h += 1
        if minutes >= 7 * 1440:  count_gt7d  += 1
        if minutes >= 30 * 1440: count_gt30d += 1

        bucket = get_aging_bucket(minutes)
        aging_counts[bucket] = aging_counts.get(bucket, 0) + 1

        area = classify_area(descricao, tipo_ral)
        area_counts[area] = area_counts.get(area, 0) + 1

        cluster_total[sigla] = cluster_total.get(sigla, 0) + 1
        if minutes >= 8 * 60:    cluster_gt8h[sigla]  = cluster_gt8h.get(sigla, 0)  + 1
        if minutes >= 24 * 60:   cluster_gt24h[sigla] = cluster_gt24h.get(sigla, 0) + 1

    def pct(v): return round(v / total * 100) if total else 0

    def make_ranking_total(totals):
        gt = sum(totals.values()) or 1
        return [{'rank': i+1,'sigla': s,'total': c,'pct': round(c/gt*100)}
                for i, (s, c) in enumerate(sorted(totals.items(), key=lambda x: x[1], reverse=True))]

    def make_ranking_pct(gt_counts, totals):
        rows_out = []
        for sigla, total_c in totals.items():
            gt_c = gt_counts.get(sigla, 0)
            p    = round(gt_c / total_c * 100) if total_c else 0
            rows_out.append({'sigla': sigla,'pct': p,'volume': gt_c,'total': total_c,'fraction': f'{gt_c}/{total_c}'})
        rows_out.sort(key=lambda x: x['pct'], reverse=True)
        for i, r in enumerate(rows_out): r['rank'] = i + 1
        return rows_out

    aging_list = [{'label': lb,'count': aging_counts.get(lb, 0),'pct': round(aging_counts.get(lb, 0) / total * 100) if total else 0}
                  for lb, _, _ in AGING_BUCKETS]
    area_list  = [{'area': a,'count': c,'pct': round(c / total * 100) if total else 0}
                  for a, c in sorted(area_counts.items(), key=lambda x: x[1], reverse=True)]

    return {
        'kpis': {
            'pendentes': total,
            'ral_gt8h': count_gt8h,   'pct_gt8h':  pct(count_gt8h),
            'ral_gt24h': count_gt24h, 'pct_gt24h': pct(count_gt24h),
            'ral_gt7d': count_gt7d,   'pct_gt7d':  pct(count_gt7d),
            'ral_gt30d': count_gt30d, 'pct_gt30d': pct(count_gt30d),
        },
        'aging':    aging_list,
        'areas':    area_list,
        'rankings': {
            'byTotal':  make_ranking_total(cluster_total),
            'byPct8h':  make_ranking_pct(cluster_gt8h,  cluster_total),
            'byPct24h': make_ranking_pct(cluster_gt24h, cluster_total),
        },
    }


def main():
    ral_file    = 'dados_ral.csv'
    output_path = 'public/data'
    output_file = os.path.join(output_path, 'ral_report.json')
    os.makedirs(output_path, exist_ok=True)

    print('Carregando dados RAL...')
    try:
        df = pd.read_csv(ral_file, sep=';', on_bad_lines='skip', encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(ral_file, sep=';', on_bad_lines='skip', encoding='latin-1')

    # Normalise column names (remove invisible chars / accents issues)
    df.columns = [c.strip() for c in df.columns]

    # Detect duration column name (may have encoding artefacts)
    dur_col  = next((c for c in df.columns if 'Dura' in c or 'dura' in c), None)
    desc_col = next((c for c in df.columns if 'Designa' in c or 'designa' in c or c == 'Designação'), None)
    code_col = 'CF Exec.'
    type_col = 'Tipo Ral'

    print(f'  dur_col={dur_col}  desc_col={desc_col}')

    # Load cluster mapping from dashboard.json
    dashboard_file = os.path.join(output_path, 'dashboard.json')
    cluster_by_code = {}
    if os.path.exists(dashboard_file):
        with open(dashboard_file, 'r', encoding='utf-8') as f:
            dash = json.load(f)
        for item in dash.get('RAL', {}).get('items', []):
            code = normalize_code(item.get('code', ''))
            if code:
                cluster_by_code[code] = item.get('cluster', 'Unknown')

    # Build rows tuples
    all_rows = []
    by_type  = {}

    def normalize_tipo(tipo):
        t = str(tipo).strip()
        t_up = t.upper()
        if 'FOT' in t_up and 'NIC' in t_up:
            return 'FOTONICA'
        return t.upper()

    for _, row in df.iterrows():
        code      = str(row.get(code_col, '')).strip()
        dur_str   = str(row.get(dur_col, '')).strip() if dur_col else ''
        descricao = str(row.get(desc_col, '')).strip() if desc_col else ''
        raw_tipo  = str(row.get(type_col, '')).strip()
        tipo_ral  = normalize_tipo(raw_tipo)

        tup = (dur_str, descricao, tipo_ral, code)
        all_rows.append(tup)
        bucket = tipo_ral if tipo_ral else 'N/A'
        by_type.setdefault(bucket, []).append(tup)

    print(f'  Tipos encontrados: {list(by_type.keys())}')

    ALLOWED_TIPOS = {'ACESSO CLIENTE', 'BACKBONE', 'COLETOR', 'FOTONICA', 'QUALIDADE'}
    filtered_tipos = [t for t in sorted(by_type.keys()) if t in ALLOWED_TIPOS]

    # Build report
    report = {
        'updatedAt': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
        'tipos':     filtered_tipos,
        'all':       build_stats(all_rows, cluster_by_code),
        'byTipo':    {tipo: build_stats(rows, cluster_by_code) for tipo, rows in by_type.items()},
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f'\n[OK] Salvo em: {output_file}')
    total = report["all"]["kpis"]["pendentes"]
    print(f'   Total: {total}')
    for tipo, rows in by_type.items():
        print(f'   {tipo}: {len(rows)}')


if __name__ == '__main__':
    main()
