import json,glob,sys
NAMES={'kitchen-in-room':'Kitchen (kitchen)','bathroom-in-room':'Bathroom (bathroom)','fuse-box-cabinet':'Fuse-box cabinet (fuse-box-cabinet)','alcove-wardrobe':'Alcove wardrobe (alcove-wardrobe)','nightstands':'Nightstands (nightstands)','tv-cabinet-b':'TV cabinet, variant B (tv-cabinet)'}
ORDER=['kitchen-in-room','alcove-wardrobe','bathroom-in-room','fuse-box-cabinet','nightstands','tv-cabinet-b']
def f(v): 
    return ('%g'%v) if isinstance(v,(int,float)) else str(v)
out=[]
for pid in ORDER:
    d=json.load(open(f'out/{pid}.drill.json'))
    out.append(f'\n### {NAMES[pid]}\n')
    if d['hinges']:
        out.append('**Doors and hinges**\n')
        out.append('| Door | Hinges on | Hinge | Overlay → B | Cup centre from hinge edge | Hinge centres from door bottom | Plates on panel | Plate centres from panel bottom (setback) | Notes |')
        out.append('|---|---|---|---|---|---|---|---|---|')
        for h in d['hinges']:
            flap='hinges_from_door_left' in h
            hz=h.get('hinges_from_door_bottom') or h.get('hinges_from_door_left')
            notes=[]
            if h['inset']: notes.append('INSET door – B and setback to verify')
            if 'ASSUMPTION' in h['hinge_side_reason']: notes.append('hinge side = assumption')
            for m in h['moved']: notes.append(f"hinge {m['hinge']} moved {f(m['from'])}→{f(m['to'])} (clear of {m['because'].split(' (')[0]})")
            side = h['hinge_side'] if not flap else 'bottom edge (flap)'
            plates = ('top face, ' + f(h['plate_setback']) + ' from front edge, under each cup') if flap else (', '.join(f(z) for z in h['plates_from_side_bottom'])+f" ({f(h['plate_setback'])})")
            out.append(f"| {h['door']['name']} | {side} | {h['hardware']} | {f(h['overlay'])} → {f(h['B'])} | {f(h['cup_from_edge'])} | {', '.join(f(z) for z in hz)}{' (from left edge)' if flap else ''} | {h['side_panel']['name']} | {plates} | {'; '.join(notes)} |")
    if d['drawers']:
        out.append('\n**Drawers (MERIVOBOX NL 500, INSERTA, BLUMOTION)**\n')
        out.append('| Front | Type | Inner width | Runner bottom line from side-panel bottom (both sides) | INSERTA holes Ø10×12 (u from left / v from bottom) | Stabiliser holes Ø10×12 | Bottom / back panel |')
        out.append('|---|---|---|---|---|---|---|')
        for r in d['drawers']:
            W,Hh=r['front_size']
            ins=f"u {f(36.5)} and {f(W-36.5)}; v 49.5 and 81.5" + (" + upper ZF4.50I2 at v 209.5" if r["type"]=="E" else "")
            stab=f"u {f(W/2-16)} and {f(W/2+16)}; v 34.5"
            out.append(f"| {r['front']['name']} | {r['type']} | {f(r['inner_width'])} | {f(r['runner_bottom_from_side_bottom'][0])} | {ins} | {stab} | {f(r['bottom_panel'][0])}×474 / {f(r['back_panel'][0])}×{f(r['back_panel'][1])} |")
    if d['shelves']:
        out.append('\n**Shelves**\n')
        out.append('| Shelf | Mounting | Holes in both end panels: u from front edge / v from panel bottom |')
        out.append('|---|---|---|')
        for s in d['shelves']:
            hs=s['holes']; us=sorted(set(h['u'] for h in hs)); vs=sorted(set(h['v'] for h in hs))
            panels=sorted(set(h['panel'].split(' (')[0] for h in hs))
            how='screws Spax 4×50 from outside, Ø4 + countersink' if s['fixed'] else 'pins Ø5×10'
            out.append(f"| {s['shelf']['name'].split(' (')[0]} | {how} | u {', '.join(f(u) for u in us)} / v {', '.join(f(v) for v in vs)} — in {', '.join(panels)} |")
    if d['handles']:
        out.append('\n**Handles – Nomet TECHNO (through holes Ø5 from the front, M4×25)**\n')
        out.append('| Front | Handle | Holes (u from left edge, v from bottom) |')
        out.append('|---|---|---|')
        for h in d['handles']:
            out.append(f"| {h['front']} | {h['handle']} | {'; '.join(f'({f(u)}, {f(v)})' for u, v in h['holes_uv'])} |")
    if d.get('tipons'):
        out.append('\n**TIP-ON 956A1006 – bore Ø10 × 76 into the FRONT EDGE of the panel, centre 7.5 mm from its inner face**\n')
        out.append('| Door | Panel | Position |')
        out.append('|---|---|---|')
        for t in d['tipons']:
            pos = f"v {f(t['v_from_panel_bottom'])} from panel bottom" if 'v_from_panel_bottom' in t else f"u {f(t['u_from_panel_left'])} from panel left end"
            out.append(f"| {t['door']} | {t['panel']} | {pos} |")
    if d.get('hangers'):
        out.append('\n**Camar 801 hangers – 2 dowel holes Ø10 × 10.5 in the inner face, top back corner (u = placeholder, VERIFY)**\n')
        out.append('| Side panel | Dowel axis below panel top | v from panel bottom |')
        out.append('|---|---|---|')
        for h in d['hangers']:
            out.append(f"| {h['panel']} | {f(h['dowel_axis_below_top'])} | {f(h['v_from_bottom'])} |")
    if d['warnings']:
        out.append('\nWarnings: ' + '; '.join(d['warnings']))
open('tables.md','w').write('\n'.join(out))
print(len(out))
