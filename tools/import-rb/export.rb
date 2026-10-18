# Usage: ruby export.rb <script.rb> <id> "<Name>" <output.json> [description]
# Runs a SketchUp script against the SketchUp API mock and writes the furniture model as JSON.
require 'json'
require_relative 'sketchup_mock'
require_relative 'classify'

src, id, title, out, desc = ARGV
# every project at the origin (the scripts shift themselves by an offset - reset it)
$laz_off = $sr_off = $sw_off = $sn_off = $rtv_off = [0, 0, 0]
$tylko_meble = nil
$stdout = File.open(File::NULL, 'w')
load File.expand_path(src)
$stdout = STDOUT

RAW_RE = /BEZ_OKLEINY/   # faces painted with this material have no edge banding
def r(v) = (v * 10).round / 10.0
def slug(s) = s.to_s.downcase.tr('ąćęłńóśźż', 'acelnoszz').gsub(/\(.*?\)/, '').gsub(/[^a-z0-9]+/, '-').gsub(/^-|-$/, '')
def axis_label(n)
  i = n.map(&:abs).each_with_index.max[1]
  "#{%w[x y z][i]}#{n[i] >= 0 ? '+' : '-'}"
end

materials = {}
groups = []
parts = []
pid = 0

walk = lambda do |ents, tr, path, gid|
  ents.groups.each do |g|
    t = tr * g.t
    name = g.name.to_s
    if g.solid
      base = g.solid[:base].map { |p| t.app(p) }
      off = t.rot(g.solid[:off])
      top = base.map { |p| [p[0] + off[0], p[1] + off[1], p[2] + off[2]] }
      pts = base + top
      mn = (0..2).map { |i| pts.map { |p| p[i] }.min }
      mx = (0..2).map { |i| pts.map { |p| p[i] }.max }
      dims = (0..2).map { |i| mx[i] - mn[i] }
      axis_off = off.map(&:abs).each_with_index.max[1]
      rect = base.size == 4 && (0..2).count { |i| base.map { |p| r(p[i]) }.uniq.size == 1 } >= 1 &&
             base.all? { |p| (0..2).count { |i| (p[i] - mn[i]).abs < 0.01 || (p[i] - mx[i]).abs < 0.01 } == 3 }
      shape = if rect
        { type: 'box', min: mn.map { |v| r(v) }, max: mx.map { |v| r(v) } }
      else
        plane = %w[yz xz xy][axis_off]
        keep = [0, 1, 2] - [axis_off]
        { type: 'extrude', plane: plane, outline: base.map { |p| keep.map { |i| r(p[i]) } },
          from: r([base[0][axis_off], top[0][axis_off]].min), to: r([base[0][axis_off], top[0][axis_off]].max) }
      end
      raw = g.solid_faces.select { |f| f.material && f.material.name.to_s =~ RAW_RE }.map { |f| axis_label(t.rot(f.normal.to_a)) }.uniq.sort
      mat = g.material
      mid = mat ? slug(mat.name) : 'none'
      materials[mid] ||= { label: mat ? mat.name : 'none', color: mat && mat.color ? format('#%02x%02x%02x', *mat.color.rgb) : '#c8c8c8' }
      th = dims.min
      parts << { id: format('p%04d', pid += 1), name: name, group: gid, unit: (gid && groups.find { |x| x[:id] == gid }[:parent] ? gid : (Classify.unit(name) || gid || 'root')), layer: Classify.layer(name: name, material: mat&.name, thickness: th, path: path),
                 material: mid, shape: shape, edges: { raw: raw }, meta: { thickness: r(th), tag: g.layer&.name } }
    elsif !g.entities.faces.empty? && g.entities.groups.empty?
      posz = []
      g.entities.faces.each do |f|
        pp = f.pts.map { |p| t.app(p) }
        (1...(pp.size - 1)).each { |k| [pp[0], pp[k], pp[k + 1]].each { |q| posz.concat(q.map { |v| r(v) }) } }
      end
      mat = g.material || g.entities.faces.first.material
      mid = mat.respond_to?(:name) ? slug(mat.name) : 'room'
      materials[mid] ||= { label: mat.respond_to?(:name) ? mat.name : 'room', color: mat.respond_to?(:color) && mat.color ? format('#%02x%02x%02x', *mat.color.rgb) : '#eeeeee' }
      parts << { id: format('p%04d', pid += 1), name: name, group: gid, unit: gid || 'root', layer: Classify.layer(name: name, material: mid, thickness: 999, path: path + [name]),
                 material: mid, shape: { type: 'mesh', positions: posz }, edges: { raw: [] }, meta: { tag: g.layer&.name } }
    else
      ngid = "g#{groups.size + 1}"
      groups << { id: ngid, name: name, parent: gid }
      walk.(g.entities, t, path + [name], ngid)
    end
  end
end
walk.(Sketchup.active_model.active_entities, Geom::Transformation.new, [], nil)

model = { format: 'furniture-model', version: 1, id: id, name: title, description: desc.to_s,
          source: "import-rb:#{File.basename(src)}", materials: materials, groups: groups, parts: parts }
File.write(out, JSON.pretty_generate(model))
warn "#{id}: #{parts.size} parts, #{groups.size} groups, layers: #{parts.group_by { |p| p[:layer] }.transform_values(&:size)}"
