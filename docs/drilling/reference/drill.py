#!/usr/bin/env python3
"""Drilling plan generator (hinges, mounting plates, shelf pins, drawer runners, INSERTA fronts, handles)
from viewer model.json files. Output: <out>/<id>.drill.json + tables for the spec."""
import json, math, re, sys, os

# ---------------- Blum / hardware parameters ----------------
P = {
    "hinge": {
        "overlay_formula": "B = overlay - 11 (CLIP top 110 deg 71B3550 and 155 deg 71B7550, 0 mm plate)",
        "cup_dia": 35, "cup_depth": 13, "cup_edge_offset": 17.5,           # cup centre = B + 17.5 from hinge edge
        "screw_spacing": 45, "screw_offset": 9.5, "screw_dia": 2.5, "screw_depth": 10,
        "plate_setback": 37, "plate_screw_spacing": 32, "plate_screw_dia": 2.5, "plate_screw_depth": 10,
        "plate_half_height": 25, "edge_dist_tall": 100, "edge_dist_small_factor": 0.22, "edge_dist_min": 45,
        "count": [[900, 2], [1600, 3], [2000, 4], [2400, 5]],
        "B_range": {"71B3550": [3, 7], "71B7550": [3, 8]},
    },
    "shelf": {"pin_dia": 5, "pin_depth": 10, "pin_from_edge": 37, "pin_below_shelf": 2.5,
              "screw_dia": 4, "screw_from_edge": 40},
    "drawer": {"FA_side": 16, "FA_bottom": 16, "front_hole_x": 20.5, "front_hole_z1": 33.5, "front_hole_pitch": 32,
               "front_hole_dia": 10, "front_hole_depth": 12, "stab_below_first": 15, "stab_pitch": 32,
               "runner_screws_from_front": [19, 37, 69, 261, 293], "runner_screw_dia": 2.5, "runner_screw_depth": 10,
               "runner_screw_above_runner_bottom": 6},
    "handle": {"dia": 5, "depth": 18, "drawer_from_top": 50, "door_from_opening_edge": 40, "door_end_hole_from_edge": 60,
               "long": {"code": "C-1149-320.P61", "name": "Nomet TECHNO 320 czarny mat", "cc": 320},
               "short": {"code": "C-1149-128.P61 (verify code)", "name": "Nomet TECHNO 128 czarny mat", "cc": 128}},
    "tipon": {"code": "956A1006", "bore_dia": 10, "bore_depth": 76, "from_inner_face": 7.5, "from_opening_edge_on_panel": 60,
              "two_units_above": 1500},
    "camar801": {"dowel_dia": 10, "dowel_depth": 10.5, "below_top_panel_underside": 42,
                 "first_dowel_from_back_edge": 20, "dowel_spacing": 32, "dowel_axis": "depth",
                 "VERIFY": "first_dowel_from_back_edge, dowel_spacing and dowel_axis are placeholders - measure the real hanger"},
}

def box(p):
    s = p["shape"]
    if s["type"] == "box":
        return s["min"], s["max"]
    if s["type"] == "extrude":
        ax = {"yz": 0, "xz": 1, "xy": 2}[s["plane"]]
        keep = [i for i in range(3) if i != ax]
        mn = [0, 0, 0]; mx = [0, 0, 0]
        for k, i in enumerate(keep):
            vals = [pt[k] for pt in s["outline"]]
            mn[i] = min(vals); mx[i] = max(vals)
        mn[ax] = s["from"]; mx[ax] = s["to"]
        return mn, mx
    return None

def dims(b): return [b[1][i] - b[0][i] for i in range(3)]
def thin_axis(b):
    d = dims(b); return d.index(min(d))
def ctr(b): return [(b[0][i] + b[1][i]) / 2 for i in range(3)]
def r1(v): return round(v * 10) / 10
def vec(i, s): v = [0, 0, 0]; v[i] = s; return v

class Plan:
    def __init__(self, model):
        self.m = model
        self.parts = []
        for p in model["parts"]:
            b = box(p)
            if b and p["layer"] != "room":
                self.parts.append(dict(p, b=b))
        self.features = []; self.hinges = []; self.drawers = []; self.shelves = []; self.warnings = []; self.handles = []; self.door_infos = []; self.tipons = []; self.hangers = []
        self.fid = 0

    def feat(self, cab, kind, part, face_n, world, local, dia, depth, hw, note=""):
        self.fid += 1
        d = [-c for c in face_n]   # drill direction = into the material = minus outward normal of the face
        self.features.append({
            "id": f"f{self.fid:04d}", "cabinet": cab, "kind": kind, "hardware": hw,
            "part": {"id": part["id"], "name": part["name"]},
            "face": ("xyz"[[i for i in range(3) if face_n[i]][0]] + ("+" if sum(face_n) > 0 else "-")),
            "world": {"p": [r1(v) for v in world], "dir": d},
            "local": local, "dia": dia, "depth": depth, "note": note})

    # ---------------------------------------------------------------- helpers
    def carcass_panels(self):
        return [p for p in self.parts if p["layer"] in ("carcass", "cladding", "fillers")]

    def cab_of(self, p):
        return re.split(r" ", p["name"])[0] if re.match(r"^[A-Z]{1,2}\d", p["name"]) else (p["unit"] if not p["unit"].startswith("g") else p["name"].split(" ")[0])

    def unit_parts(self, unit):
        return [p for p in self.parts if p["unit"] == unit]

    def door_frame(self, d):
        """outward normal n (axis, sign), lateral axis a, right sign (viewer looking at the front)."""
        b = d["b"]; ai = thin_axis(b)
        car = [p for p in self.unit_parts(d["unit"]) if p["layer"] == "carcass"]
        if not car:
            car = [p for p in self.carcass_panels() if p["unit"] == d["unit"]]
        cc = ctr((min_corner(car), max_corner(car))) if car else [0, 0, 0]
        sgn = 1 if ctr(b)[ai] > cc[ai] else -1
        n = vec(ai, sgn)
        a = [i for i in (0, 1) if i != ai][0]
        v = [-c for c in n]; up = [0, 0, 1]
        right = [v[1] * up[2] - v[2] * up[1], v[2] * up[0] - v[0] * up[2], v[0] * up[1] - v[1] * up[0]]
        return n, ai, sgn, a, int(right[a])

    def side_panel_at(self, edge, a, n_ax, n_sgn, door_back, zlo, zhi, inward_sgn):
        """vertical panel with thin axis a whose inner face is inward of `edge`, just behind the door."""
        best = None
        for p in self.carcass_panels():
            b = p["b"]
            if thin_axis(b) != a: continue
            # depth: panel front face close behind the door back face
            front = b[1][n_ax] if n_sgn > 0 else b[0][n_ax]
            gap = (door_back - front) * n_sgn
            if not (-1 <= gap <= 30): continue
            if min(b[1][2], zhi) - max(b[0][2], zlo) < 0.5 * (zhi - zlo) and min(b[1][2], zhi) - max(b[0][2], zlo) < 150: continue
            inner = b[0][a] if inward_sgn < 0 else b[1][a]          # face toward the door centre
            inner = b[1][a] if inward_sgn > 0 else b[0][a]
            # inward_sgn: direction from hinge edge toward door centre along a
            face_toward_centre = b[1][a] if inward_sgn > 0 else b[0][a]
            outer = b[0][a] if inward_sgn > 0 else b[1][a]
            ov = (face_toward_centre - edge) * inward_sgn
            if -25 <= ov <= 25 and ((outer - edge) * inward_sgn) <= 2:
                score = abs(ov - 16) + abs(gap)
                if best is None or score < best[0]:
                    best = (score, p, ov, face_toward_centre, gap)
            elif -25 <= ov <= 25 and ((outer - edge) * inward_sgn) > 2:
                # panel lies entirely inward of the door edge -> inset case candidate
                pass
        return best

    def inset_side(self, edge, a, n_ax, n_sgn, door_front, zlo, zhi, inward_sgn):
        """panel beside an inset door: its face toward the door is just outside the door edge, front flush with door front."""
        best = None
        for p in self.carcass_panels():
            b = p["b"]
            if thin_axis(b) != a: continue
            if min(b[1][2], zhi) - max(b[0][2], zlo) < 0.8 * (zhi - zlo): continue
            front = b[1][n_ax] if n_sgn > 0 else b[0][n_ax]
            if abs(front - door_front) > 3: continue
            face = b[1][a] if inward_sgn > 0 else b[0][a]
            gapl = (edge - face) * inward_sgn
            if 0 <= gapl <= 5:
                if best is None or gapl < best[0]:
                    best = (gapl, p, face)
        return best

    def blockers(self, side, n_ax, n_sgn, depth_lo, depth_hi):
        """horizontal-ish carcass panels touching the side panel inner region within the plate depth window."""
        out = []
        sb = side["b"]; front = sb[1][n_ax] if n_sgn > 0 else sb[0][n_ax]
        for p in self.carcass_panels():
            if p is side: continue
            b = p["b"]
            if thin_axis(b) == thin_axis(sb): continue
            # depth window measured from side front edge
            d0 = (front - b[1][n_ax]) * n_sgn if n_sgn > 0 else (b[0][n_ax] - front)
            d1 = (front - b[0][n_ax]) * n_sgn if n_sgn > 0 else (b[1][n_ax] - front)
            lo, hi = min(d0, d1), max(d0, d1)
            if hi < depth_lo or lo > depth_hi: continue
            if lo < -0.5 or p["layer"] == "fillers": continue
            a = thin_axis(sb)
            # must touch the side panel (within 1 mm) along a
            if not (b[0][a] <= sb[1][a] + 1 and b[1][a] >= sb[0][a] - 1): continue
            if b[1][2] < sb[0][2] - 1 or b[0][2] > sb[1][2] + 1: continue
            out.append(p)
        return out

    # ---------------------------------------------------------------- doors
    def doors(self, hinge_overrides):
        fronts = [p for p in self.parts if p["layer"] == "front"]
        handles = [p for p in self.parts if p["layer"] == "handles"]
        for d in fronts:
            nm = d["name"]
            if re.search(r"Szuflada", nm):
                self.drawer(d); continue
            if re.search(r"Zmywarka|GB Front", nm):
                continue
            self.door(d, handles, hinge_overrides)

    def door(self, d, handles, ov):
        H = P["hinge"]; b = d["b"]; nm = d["name"]
        n, ni, ns, a, rs = self.door_frame(d)
        cab = nm.split(" ")[0] if not nm.startswith("P ") else "Pawlacz"
        if nm.startswith("N1") or nm.startswith("N2"): cab = " ".join(nm.split(" ")[:2])
        if nm.startswith("RTV"): cab = " ".join(nm.split(" ")[:2])
        if nm.startswith("Drzwi"): cab = "Rozdzielnia"
        zlo, zhi = b[0][2], b[1][2]
        door_back = b[0][ni] if ns > 0 else b[1][ni]
        door_front = b[1][ni] if ns > 0 else b[0][ni]
        flap = "Klapa" in nm
        # ---- which edge carries the hinges
        side_rule = None; reason = ""
        for key, val in ov.items():
            if key in nm: side_rule, reason = val
        if side_rule is None:
            if re.search(r"zawiasy L", nm): side_rule, reason = "L", "label"
            elif re.search(r"zawiasy P", nm): side_rule, reason = "P", "label"
        hnd = [h for h in handles if overlap(h["b"], b, a) and overlap(h["b"], b, 2)
               and abs(((h["b"][0][ni] + h["b"][1][ni]) / 2 - door_front) * ns) < 40]
        handle_side = None
        if hnd and not flap:
            hc = sum((h["b"][0][a] + h["b"][1][a]) / 2 for h in hnd) / len(hnd)
            mid = (b[0][a] + b[1][a]) / 2
            if abs(hc - mid) > 0.15 * (b[1][a] - b[0][a]):
                handle_side = "P" if (hc - mid) * rs > 0 else "L"
        if side_rule is None and handle_side:
            side_rule, reason = ("L" if handle_side == "P" else "P"), "opposite the handle"
        if side_rule is None:
            if re.search(r"Drzwi L |Drzwi lewe", nm): side_rule, reason = "L", "door name (left door)"
            elif re.search(r"Drzwi P |Drzwi prawe", nm): side_rule, reason = "P", "door name (right door)"
        if side_rule and handle_side and side_rule == handle_side and not flap:
            self.warnings.append(f"{nm}: hinge side {side_rule} is the same side as the handle")
        hw = "71B7550" if ("155" in nm) else "71B3550"
        if flap:
            return self.flap(d, cab, n, ni, ns, a, rs, hw)
        if side_rule is None:
            self.warnings.append(f"{nm}: hinge side unknown - skipped"); return
        edge = b[1][a] if (side_rule == "P") == (rs > 0) else b[0][a]
        inward = -1 if edge == b[1][a] else 1
        sp = self.side_panel_at(edge, a, ni, ns, door_back, zlo, zhi, inward)
        inset = False
        if sp is None:
            ins = self.inset_side(edge, a, ni, ns, door_front, zlo, zhi, inward)
            if ins is None:
                self.warnings.append(f"{nm}: no carcass side found behind the hinge edge"); return
            inset = True; hw = "71B3750"
            gapl, side, face = ins; overlay = -gapl
            B = 5
        else:
            _, side, overlay, face, gap = sp
            B = overlay - 11
        lo, hi = P["hinge"]["B_range"].get(hw, [3, 7])
        if not inset and not (lo <= B <= hi):
            self.warnings.append(f"{nm}: overlay {overlay} -> B={B} outside Blum range {lo}-{hi}")
        Hh = zhi - zlo
        cnt = next(c for lim, c in H["count"] if Hh <= lim)
        ed = H["edge_dist_tall"] if Hh >= 400 else max(H["edge_dist_min"], round(Hh * H["edge_dist_small_factor"]))
        zs = [zlo + ed + i * (Hh - 2 * ed) / (cnt - 1) for i in range(cnt)]
        sb = side["b"]
        side_front = sb[1][ni] if ns > 0 else sb[0][ni]
        setback = H["plate_setback"] + (18 + 1.5 if inset else 0)
        blk = self.blockers(side, ni, ns, 0, setback + 25)
        moved = []
        out_z = []
        for k, z in enumerate(zs):
            z0 = z
            def clash(zz):
                for p in blk:
                    if zz + H["plate_half_height"] > p["b"][0][2] - 8 and zz - H["plate_half_height"] < p["b"][1][2] + 3:
                        return p
                if zz - H["plate_half_height"] < sb[0][2] or zz + H["plate_half_height"] > sb[1][2]: return "side end"
                if zz - 17.5 < zlo + 8 or zz + 17.5 > zhi - 8: return "door edge"
                return None
            if clash(z):
                for dz in range(1, 200):
                    cand = [z + dz, z - dz] if (k > 0 and k < cnt - 1) else ([z + dz] if k == 0 else [z - dz])
                    if k in (0, cnt - 1): cand += [z - dz] if k == 0 else [z + dz]
                    hit = next((c for c in cand if not clash(c)), None)
                    if hit is not None: z = hit; break
                else:
                    self.warnings.append(f"{nm}: hinge {k+1} cannot avoid {clash(z)}")
                moved.append({"hinge": k + 1, "from": r1(z0 - zlo), "to": r1(z - zlo),
                              "because": clash(z0)["name"] if isinstance(clash(z0), dict) else clash(z0)})
            out_z.append(z)
        out_z = [round(z) for z in out_z]
        cup_u = B + H["cup_edge_offset"]
        rec = {"cabinet": cab, "door": {"id": d["id"], "name": nm}, "size": [r1(b[1][a] - b[0][a]), r1(Hh)],
               "hinge_side": side_rule, "hinge_side_reason": reason, "hardware": hw, "inset": inset,
               "side_panel": {"id": side["id"], "name": side["name"]}, "overlay": r1(overlay), "B": r1(B),
               "cup_from_edge": r1(cup_u), "plate_setback": setback,
               "hinges_from_door_bottom": [r1(z - zlo) for z in out_z],
               "plates_from_side_bottom": [r1(z - sb[0][2]) for z in out_z], "moved": moved}
        self.hinges.append(rec)
        self.door_infos.append({"d": d, "cab": cab, "n": n, "ni": ni, "ns": ns, "a": a, "rs": rs, "hinge_edge": edge,
                                "inward": inward, "zlo": zlo, "zhi": zhi, "door_back": door_back, "door_front": door_front})
        # features: door (back face, normal = -n)
        dn = [-c for c in n]
        for z in out_z:
            ux = edge + inward * cup_u
            wp = [0, 0, 0]; wp[a] = ux; wp[ni] = door_back; wp[2] = z
            self.feat(cab, "hinge-cup", d, dn, wp, {"u": r1(cup_u), "v": r1(z - zlo), "u_from": "hinge edge", "v_from": "door bottom edge", "face": "back"},
                      H["cup_dia"], H["cup_depth"], hw)
            for s in (-1, 1):
                wp2 = list(wp); wp2[a] = edge + inward * (cup_u + H["screw_offset"]); wp2[2] = z + s * H["screw_spacing"] / 2
                self.feat(cab, "hinge-screw", d, dn, wp2, {"u": r1(cup_u + H["screw_offset"]), "v": r1(z + s * 22.5 - zlo), "u_from": "hinge edge", "v_from": "door bottom edge", "face": "back"},
                          H["screw_dia"], H["screw_depth"], "609.1500")
            # plate on side panel inner face
            fn = vec(a, inward)
            for s in (-1, 1):
                wp3 = [0, 0, 0]; wp3[a] = face; wp3[ni] = side_front - ns * setback; wp3[2] = z + s * H["plate_screw_spacing"] / 2
                self.feat(cab, "plate-screw", side, fn, wp3, {"u": setback, "v": r1(z + s * 16 - sb[0][2]), "u_from": "front edge", "v_from": "panel bottom edge", "face": "inner (towards the door centre)"},
                          H["plate_screw_dia"], H["plate_screw_depth"], "173L6100" if not inset else "173L6100 (inset setback)")

    def flap(self, d, cab, n, ni, ns, a, rs, hw):
        H = P["hinge"]; b = d["b"]; nm = d["name"]
        zlo = b[0][2]; door_back = b[0][ni] if ns > 0 else b[1][ni]
        # plate surface: top face of the panel directly under/behind the flap bottom edge
        best = None
        for p in self.carcass_panels():
            pb = p["b"]
            if thin_axis(pb) != 2: continue
            if not overlap(pb, b, a): continue
            front = pb[1][ni] if ns > 0 else pb[0][ni]
            if not (-1 <= (door_back - front) * ns <= 30): continue
            ov = pb[1][2] - zlo
            if 0 < ov < 25 and (best is None or abs(ov - 16) < abs(best[1] - 16)): best = (p, ov)
        if not best:
            self.warnings.append(f"{nm}: flap support panel not found"); return
        side, overlay = best; B = overlay - 11; sb = side["b"]
        side_front = sb[1][ni] if ns > 0 else sb[0][ni]
        W = b[1][a] - b[0][a]; ed = 100
        left_edge = b[0][a] if rs > 0 else b[1][a]
        us = [ed, W - ed]
        rec = {"cabinet": cab, "door": {"id": d["id"], "name": nm}, "size": [r1(W), r1(b[1][2] - zlo)], "hinge_side": "bottom (flap)",
               "hinge_side_reason": "label", "hardware": hw, "inset": False, "side_panel": {"id": side["id"], "name": side["name"]},
               "overlay": r1(overlay), "B": r1(B), "cup_from_edge": r1(B + 17.5), "plate_setback": 37,
               "hinges_from_door_left": us, "moved": []}
        self.hinges.append(rec)
        dn = [-c for c in n]
        for u in us:
            x = left_edge + u * rs
            wp = [0, 0, 0]; wp[a] = x; wp[ni] = door_back; wp[2] = zlo + B + 17.5
            self.feat(cab, "hinge-cup", d, dn, wp, {"u": u, "v": r1(B + 17.5), "u_from": "left edge (viewed from the front)", "v_from": "bottom (hinge) edge", "face": "back"}, 35, 13, hw)
            for s in (-1, 1):
                wp2 = list(wp); wp2[a] = x + s * 22.5 * rs; wp2[2] = zlo + B + 17.5 + 9.5
                self.feat(cab, "hinge-screw", d, dn, wp2, {"u": u + s * 22.5, "v": r1(B + 27), "u_from": "left edge (viewed from the front)", "v_from": "bottom (hinge) edge", "face": "back"}, 2.5, 10, "609.1500")
                wp3 = [0, 0, 0]; wp3[a] = x + s * 16 * rs; wp3[ni] = side_front - ns * 37; wp3[2] = sb[1][2]
                lu = abs(wp3[a] - (sb[0][a] if rs > 0 else sb[1][a]))
                self.feat(cab, "plate-screw", side, [0, 0, 1], wp3, {"u": 37, "v": r1(lu), "u_from": "front edge", "v_from": "left end of the panel (viewed from the front)", "face": "top"}, 2.5, 10, "173L6100")

    # ---------------------------------------------------------------- drawers
    def drawer(self, f):
        Dp = P["drawer"]; b = f["b"]; nm = f["name"]
        n, ni, ns, a, rs = self.door_frame(f)
        cab = nm.split(" ")[0]
        door_back = b[0][ni] if ns > 0 else b[1][ni]
        zlo = b[0][2]; W = b[1][a] - b[0][a]
        left_edge = b[0][a] if rs > 0 else b[1][a]
        sides = []
        for edge, inward in ((b[0][a], 1), (b[1][a], -1)):
            sp = self.side_panel_at(edge, a, ni, ns, door_back, zlo, b[1][2], inward)
            if not sp: self.warnings.append(f"{nm}: drawer side panel missing"); return
            sides.append(sp)
        inner_w = abs(sides[0][3] - sides[1][3])
        z_runner = zlo + Dp["FA_bottom"]
        typ = re.search(r"\((\w)", nm).group(1)
        rec = {"cabinet": cab, "front": {"id": f["id"], "name": nm}, "type": typ, "front_size": [r1(W), r1(b[1][2] - zlo)],
               "inner_width": r1(inner_w), "overlays": [r1(sides[0][2]), r1(sides[1][2])],
               "runner_bottom_from_side_bottom": None, "runner_bottom_world_z": r1(z_runner),
               "bottom_panel": [r1(inner_w - 51), 474], "back_panel": [r1(inner_w - 51), {"M": 83, "K": 121, "E": 184}.get(typ)]}
        dn = [-c for c in n]
        # INSERTA front fixing holes (back face of the front)
        for k in (0, 1):
            for side_u in (Dp["FA_side"] + Dp["front_hole_x"], W - Dp["FA_side"] - Dp["front_hole_x"]):
                v = Dp["FA_bottom"] + Dp["front_hole_z1"] + k * Dp["front_hole_pitch"]
                wp = [0, 0, 0]; wp[a] = left_edge + side_u * rs; wp[ni] = door_back; wp[2] = zlo + v
                self.feat(cab, "front-fixing", f, dn, wp, {"u": r1(side_u), "v": r1(v), "u_from": "left edge (viewed from the front)", "v_from": "front bottom edge", "face": "back"},
                          Dp["front_hole_dia"], Dp["front_hole_depth"], "ZF4.10I2 (INSERTA)")
        if typ == "E":   # E with gallery rail: upper front fixing 128 above the upper lower-fixing hole
            for side_u in (Dp["FA_side"] + Dp["front_hole_x"], W - Dp["FA_side"] - Dp["front_hole_x"]):
                v = Dp["FA_bottom"] + Dp["front_hole_z1"] + Dp["front_hole_pitch"] + 128
                wp = [0, 0, 0]; wp[a] = left_edge + side_u * rs; wp[ni] = door_back; wp[2] = zlo + v
                self.feat(cab, "front-fixing-top", f, dn, wp, {"u": r1(side_u), "v": r1(v), "u_from": "left edge (viewed from the front)", "v_from": "front bottom edge", "face": "back"},
                          Dp["front_hole_dia"], Dp["front_hole_depth"], "ZF4.50I2 (INSERTA, gallery rail)")
        for s in (-1, 1):
            u = W / 2 + s * Dp["stab_pitch"] / 2; v = Dp["FA_bottom"] + Dp["front_hole_z1"] - Dp["stab_below_first"]
            wp = [0, 0, 0]; wp[a] = left_edge + u * rs; wp[ni] = door_back; wp[2] = zlo + v
            self.feat(cab, "front-stabiliser", f, dn, wp, {"u": r1(u), "v": r1(v), "u_from": "left edge (viewed from the front)", "v_from": "front bottom edge", "face": "back"},
                      Dp["front_hole_dia"], Dp["front_hole_depth"], "Z96.10E1")
        rb = []
        for _, side, ov, face, gap in sides:
            sb = side["b"]; side_front = sb[1][ni] if ns > 0 else sb[0][ni]
            fn = vec(a, 1 if face == sb[1][a] else -1)
            rb.append(r1(z_runner - sb[0][2]))
            for u in Dp["runner_screws_from_front"]:
                wp = [0, 0, 0]; wp[a] = face; wp[ni] = side_front - ns * u; wp[2] = z_runner + Dp["runner_screw_above_runner_bottom"]
                self.feat(cab, "runner-screw", side, fn, wp, {"u": u, "v": r1(z_runner - sb[0][2] + Dp["runner_screw_above_runner_bottom"]), "u_from": "front edge", "v_from": "panel bottom edge", "face": "inner",
                                                             "runner_line_v": r1(z_runner - sb[0][2])},
                          Dp["runner_screw_dia"], Dp["runner_screw_depth"], "450.5001B + screws 4x15",
                          note="screw height approximate - place the runner bottom on runner_line_v and drill through the runner holes")
        rec["runner_bottom_from_side_bottom"] = rb
        rec["side_panels"] = [{"id": s[1]["id"], "name": s[1]["name"]} for s in sides]
        self.drawers.append(rec)

    # ---------------------------------------------------------------- shelves
    def shelves_all(self, fixed_re):
        S = P["shelf"]
        for p in self.carcass_panels():
            if not re.search(r"Polka|Przegroda pod", p["name"]): continue
            b = p["b"]
            if thin_axis(b) != 2: continue
            fixed = bool(re.search(fixed_re, p["name"]))
            # depth axis = the horizontal axis along which the shelf is shortest? use the unit's fronts: depth axis = y unless shelf faces x
            dep = self.front_axis(p)
            a_len = 1 - dep
            # find the two vertical panels at both ends
            ends = []
            for end, sgn in ((b[0][a_len], -1), (b[1][a_len], 1)):
                cand = None
                for q in self.carcass_panels():
                    qb = q["b"]
                    if thin_axis(qb) != a_len or q is p: continue
                    face = qb[0][a_len] if sgn > 0 else qb[1][a_len]
                    if abs(face - end) > 1.5: continue
                    if qb[0][2] > b[0][2] or qb[1][2] < b[1][2]: continue
                    if qb[1][dep] < b[0][dep] or qb[0][dep] > b[1][dep]: continue
                    cand = (q, face, sgn); break
                ends.append(cand)
            # front direction: the side of the panel facing the room = the end where fronts are; use sign of the side panel front
            unit_front = self.front_dir(p, dep)
            cab = p["name"].split(" ")[0]
            rec = {"cabinet": cab, "shelf": {"id": p["id"], "name": p["name"]}, "fixed": fixed, "z_bottom": r1(b[0][2]), "holes": []}
            sfront = b[1][dep] if unit_front > 0 else b[0][dep]
            sback = b[0][dep] if unit_front > 0 else b[1][dep]
            depth = abs(sfront - sback)
            for e in ends:
                if not e:
                    self.warnings.append(f"{p['name']}: end support panel not found"); continue
                q, face, sgn = e; qb = q["b"]
                qfront = qb[1][dep] if unit_front > 0 else qb[0][dep]
                fn = vec(a_len, -sgn)    # face of the side looking at the shelf
                if fixed:
                    us = [S["screw_from_edge"], depth - S["screw_from_edge"]] + ([depth / 2] if depth > 300 else [])
                    for u in sorted(us):
                        wp = [0, 0, 0]; wp[a_len] = qb[1][a_len] if sgn > 0 else qb[0][a_len]  # outer face (screw from outside)
                        wp[dep] = sfront - unit_front * u; wp[2] = (b[0][2] + b[1][2]) / 2
                        uu = abs(wp[dep] - qfront)
                        self.feat(cab, "shelf-screw", q, vec(a_len, sgn), wp, {"u": r1(uu), "v": r1(wp[2] - qb[0][2]), "u_from": "front edge", "v_from": "panel bottom edge", "face": "outer"},
                                  S["screw_dia"], 18, "Spax 4x50", note="through the side, countersink; pilot 2.5 mm into the shelf edge")
                        rec["holes"].append({"panel": q["name"], "u": r1(uu), "v": r1(wp[2] - qb[0][2])})
                else:
                    for u in (S["pin_from_edge"], depth - S["pin_from_edge"]):
                        wp = [0, 0, 0]; wp[a_len] = face; wp[dep] = sfront - unit_front * u; wp[2] = b[0][2] - S["pin_below_shelf"]
                        uu = abs(wp[dep] - qfront)
                        self.feat(cab, "shelf-pin", q, fn, wp, {"u": r1(uu), "v": r1(wp[2] - qb[0][2]), "u_from": "front edge", "v_from": "panel bottom edge", "face": "inner"},
                                  S["pin_dia"], S["pin_depth"], "podporka 5 mm")
                        rec["holes"].append({"panel": q["name"], "u": r1(uu), "v": r1(wp[2] - qb[0][2])})
            self.shelves.append(rec)

    def front_axis(self, p):
        fr = [q for q in self.parts if q["layer"] == "front" and q["unit"] == p["unit"]]
        if not fr:
            fr = sorted([q for q in self.parts if q["layer"] == "front"], key=lambda q: dist(ctr(q["b"]), ctr(p["b"])))[:1]
        return thin_axis(fr[0]["b"])

    def front_dir(self, p, dep):
        fr = [q for q in self.parts if q["layer"] == "front" and q["unit"] == p["unit"]]
        if not fr:
            fr = [q for q in self.parts if q["layer"] == "front"]
            fr.sort(key=lambda q: dist(ctr(q["b"]), ctr(p["b"])))
            fr = fr[:1]
        c = ctr(fr[0]["b"])[dep]
        return 1 if c > ctr(p["b"])[dep] else -1

    # ---------------------------------------------------------------- handles
    def handles_all(self):
        hs = [p for p in self.parts if p["layer"] == "handles"]
        fronts = [p for p in self.parts if p["layer"] == "front"]
        for h in hs:
            if "190" in h["name"] and "wspornik" not in h["name"]: continue
            hb = h["b"]; hc = ctr(hb)
            f = next((q for q in fronts if all(q["b"][0][i] - 30 <= hc[i] <= q["b"][1][i] + 30 for i in range(3))), None)
            if not f: continue
            n, ni, ns, a, rs = self.door_frame(f)
            fb = f["b"]; front_face = fb[1][ni] if ns > 0 else fb[0][ni]
            left_edge = fb[0][a] if rs > 0 else fb[1][a]
            u = abs(hc[a] - left_edge); v = hc[2] - fb[0][2]
            wp = [0, 0, 0]; wp[a] = hc[a]; wp[ni] = front_face; wp[2] = hc[2]
            self.feat(f["name"].split(" ")[0], "handle-hole", f, n, wp, {"u": r1(u), "v": r1(v), "u_from": "left edge (viewed from the front)", "v_from": "front bottom edge", "face": "front"},
                      P["handle"]["dia"], 18, "M4 screw", note="through hole, drill from the front with a backing board")
            self.handles.append({"front": f["name"], "u": r1(u), "v": r1(v), "kind": "190 mm bar (one of 2 holes, 160 c/c)" if "190" in h["name"] else "32 mm knob"})

    # ---------------------------------------------------------------- rule-based handles (kitchen, Nomet TECHNO)
    def front_geom(self, f):
        n, ni, ns, a, rs = self.door_frame(f)
        b = f["b"]; front_face = b[1][ni] if ns > 0 else b[0][ni]
        left = b[0][a] if rs > 0 else b[1][a]
        return n, ni, ns, a, rs, b, front_face, left

    def handle_holes(self, f, cab, pts, model):
        n, ni, ns, a, rs, b, ff, left = self.front_geom(f)
        Hd = P["handle"]
        for (u, v) in pts:
            wp = [0, 0, 0]; wp[a] = left + u * rs; wp[ni] = ff; wp[2] = b[0][2] + v
            self.feat(cab, "handle-hole", f, n, wp, {"u": r1(u), "v": r1(v), "u_from": "left edge (viewed from the front)", "v_from": "front bottom edge", "face": "front"},
                      Hd["dia"], Hd["depth"], model["code"], note="through hole from the front (backing board behind), M4x25 screws")
        self.handles.append({"front": f["name"], "handle": model["name"], "holes_uv": [[r1(u), r1(v)] for u, v in pts]})

    def handles_rules(self):
        Hd = P["handle"]; L = Hd["long"]; S = Hd["short"]
        fronts = [p for p in self.parts if p["layer"] == "front"]
        doors_by_id = {di["d"]["id"]: di for di in self.door_infos}
        for f in fronts:
            nm = f["name"]; cab = nm.split(" ")[0]
            n, ni, ns, a, rs, b, ff, left = self.front_geom(f)
            W = b[1][a] - b[0][a]; H = b[1][2] - b[0][2]
            if re.search(r"Szuflada|Zmywarka", nm):
                v = H - Hd["drawer_from_top"]
                self.handle_holes(f, cab, [(W / 2 - L["cc"] / 2, v), (W / 2 + L["cc"] / 2, v)], L)
            elif "Klapa" in nm:
                self.handle_holes(f, cab, [(W / 2 - S["cc"] / 2, H / 2), (W / 2 + S["cc"] / 2, H / 2)], S)
            elif f["id"] in doors_by_id:
                di = doors_by_id[f["id"]]
                hinge_left = (di["hinge_edge"] == (b[0][a] if rs > 0 else b[1][a]))
                u = W - Hd["door_from_opening_edge"] if hinge_left else Hd["door_from_opening_edge"]
                if b[0][2] > 1200:      # wall unit: handle near the bottom
                    v0 = Hd["door_end_hole_from_edge"]; pts = [(u, v0), (u, v0 + S["cc"])]
                else:                    # base / tall: near the top
                    v1 = H - Hd["door_end_hole_from_edge"]; pts = [(u, v1 - S["cc"]), (u, v1)]
                self.handle_holes(f, cab, pts, S)

    # ---------------------------------------------------------------- TIP-ON (doors without handles)
    def tipons_all(self):
        T = P["tipon"]
        for di in self.door_infos:
            d = di["d"]; b = d["b"]; a = di["a"]; ni = di["ni"]; ns = di["ns"]
            H = di["zhi"] - di["zlo"]
            open_edge = b[1][a] if di["hinge_edge"] == b[0][a] else b[0][a]
            inward = 1 if open_edge == b[0][a] else -1
            if H > T["two_units_above"]:
                vs = [round(H * 0.35), round(H * 0.65)]
            elif di["zlo"] > 1200:
                vs = [100]
            elif di["zhi"] < 1300:
                vs = [round(H - 100)]
            else:
                vs = [round(H / 2)]
            sp = self.side_panel_at(open_edge, a, ni, ns, di["door_back"], di["zlo"], di["zhi"], inward)
            for v in vs:
                z = di["zlo"] + v
                if sp:
                    _, side, ov, face, gap = sp; sb = side["b"]
                    front = sb[1][ni] if ns > 0 else sb[0][ni]
                    wp = [0, 0, 0]; wp[a] = face - inward * (-T["from_inner_face"]); wp[ni] = front; wp[2] = z
                    wp[a] = face + (T["from_inner_face"] if face == sb[0][a] else -T["from_inner_face"])
                    self.feat(di["cab"], "tipon-bore", side, vec(ni, ns), wp,
                              {"u": T["from_inner_face"], "v": r1(z - sb[0][2]), "u_from": "inner face (bore in the FRONT EDGE of the panel)", "v_from": "panel bottom edge", "face": "front edge"},
                              T["bore_dia"], T["bore_depth"], T["code"], note="Blum template 65.5010; position allowed +-300 mm in height")
                    self.tipons.append({"door": d["name"], "panel": side["name"], "v_from_panel_bottom": r1(z - sb[0][2]), "v_from_door_bottom": v})
                else:
                    # double doors meeting in the middle: bore into the front edge of the top (wall/tall) or bottom panel
                    cands = [p for p in self.carcass_panels() if thin_axis(p["b"]) == 2 and overlap(p["b"], b, a)
                             and abs((p["b"][1][ni] if ns > 0 else p["b"][0][ni]) - di["door_back"]) < 30]
                    if not cands:
                        self.warnings.append(f"{d['name']}: no panel for TIP-ON"); break
                    top = [p for p in cands if p["b"][0][2] >= (di["zhi"] - 60)]
                    bot = [p for p in cands if p["b"][1][2] <= (di["zlo"] + 60)]
                    if len(vs) == 2 and v == vs[1] and bot:
                        pan = sorted(bot, key=lambda p: -p["b"][1][2])[0]
                    else:
                        pan = (sorted(top, key=lambda p: p["b"][0][2])[0] if top else sorted(cands, key=lambda p: -p["b"][1][2])[0])
                    pb = pan["b"]; front = pb[1][ni] if ns > 0 else pb[0][ni]
                    under = pan in top and pan not in bot
                    wp = [0, 0, 0]; wp[a] = open_edge + inward * T["from_opening_edge_on_panel"]; wp[ni] = front
                    wp[2] = (pb[0][2] + T["from_inner_face"]) if under else (pb[1][2] - T["from_inner_face"])
                    pleft = pb[0][a] if di["rs"] > 0 else pb[1][a]
                    self.feat(di["cab"], "tipon-bore", pan, vec(ni, ns), wp,
                              {"u": r1(abs(wp[a] - pleft)), "v": T["from_inner_face"], "u_from": "left end of the panel (viewed from the front)",
                               "v_from": "inner (door-side) face; bore in the FRONT EDGE", "face": "front edge"},
                              T["bore_dia"], T["bore_depth"], T["code"], note="double door: unit in the top/bottom panel, 60 mm from the opening edge")
                    self.tipons.append({"door": d["name"], "panel": pan["name"], "u_from_panel_left": r1(abs(wp[a] - pleft))})
                    if not (len(vs) == 2 and bot): break

    # ---------------------------------------------------------------- Camar 801 wall-cabinet hangers
    def camar801_all(self, cabinet_re):
        C = P["camar801"]
        for p in self.carcass_panels():
            if not re.match(cabinet_re, p["name"]) or not re.search(r"Bok", p["name"]): continue
            b = p["b"]; a = thin_axis(b)
            tops = [q for q in self.carcass_panels() if thin_axis(q["b"]) == 2 and abs(q["b"][1][2] - b[1][2]) < 1
                    and (abs(q["b"][0][a] - b[1][a]) < 1 or abs(q["b"][1][a] - b[0][a]) < 1)]
            if not tops: self.warnings.append(f"{p['name']}: no top panel for Camar 801"); continue
            q = tops[0]; inner_face = b[1][a] if abs(q["b"][0][a] - b[1][a]) < 1 else b[0][a]
            face_sign = 1 if inner_face == b[1][a] else -1
            dep = 1 - a                              # depth axis (wall cabinets: y), back = wall side (max y)
            back = b[1][dep]
            z = q["b"][0][2] - C["below_top_panel_underside"]
            for k in range(2):
                u = C["first_dowel_from_back_edge"] + k * C["dowel_spacing"]
                wp = [0, 0, 0]; wp[a] = inner_face; wp[dep] = back - u; wp[2] = z
                self.feat(p["name"].split(" ")[0], "hanger-dowel", p, vec(a, face_sign), wp,
                          {"u": u, "v": r1(z - b[0][2]), "u_from": "BACK edge", "v_from": "panel bottom edge", "face": "inner"},
                          C["dowel_dia"], C["dowel_depth"], "Camar 801", note="u and spacing are placeholders - measure the hanger")
            self.hangers.append({"panel": p["name"], "dowel_axis_below_top": r1(b[1][2] - z), "v_from_bottom": r1(z - b[0][2])})


def overlap(b1, b2, i): return min(b1[1][i], b2[1][i]) - max(b1[0][i], b2[0][i]) > 0
def min_corner(ps): return [min(p["b"][0][i] for p in ps) for i in range(3)]
def max_corner(ps): return [max(p["b"][1][i] for p in ps) for i in range(3)]
def dist(a, b): return math.dist(a, b)

OVERRIDES = {
    "B1 Drzwiczki": ("P", "label: hinges on the dishwasher side"),
    "B4 Drzwiczki": ("L", "label: hinges on B4 side, opens left"),
    "P1 Drzwi": ("P", "label: hinges on the drawer (P2) side"),
    "N1 lewa Drzwiczki": ("L", "confirmed: hinge on the side away from the bed"),
    "N2 prawa Drzwiczki": ("P", "confirmed: hinge on the side away from the bed"),
    "L6 Drzwi": ("L", "confirmed: hinge on the living-room side (L2)"),
}
FIXED = r"pod piekarnik|N\d (lewa|prawa) Polka"

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for f in sys.argv[2:]:
        m = json.load(open(f)); pl = Plan(m)
        pl.doors(OVERRIDES); pl.shelves_all(FIXED)
        if m['id'].startswith('kitchen'):
            pl.handles_rules(); pl.camar801_all(r'G[234] ')
        else:
            pl.tipons_all()
        res = {"format": "drill-plan", "version": 1, "project": m["id"], "generated_from": m.get("source"),
               "units": "mm, world coordinates of the viewer model (Z up); local u/v measured on the named face",
               "parameters": P, "hinges": pl.hinges, "drawers": pl.drawers, "shelves": pl.shelves, "handles": pl.handles, "tipons": pl.tipons, "hangers": pl.hangers,
               "warnings": pl.warnings, "features": pl.features}
        json.dump(res, open(os.path.join(out, m["id"] + ".drill.json"), "w"), indent=1, ensure_ascii=False)
        print(m["id"], len(pl.features), "features;", len(pl.hinges), "doors;", len(pl.drawers), "drawers;", len(pl.shelves), "shelves")
        for w in pl.warnings: print("   WARN", w)
