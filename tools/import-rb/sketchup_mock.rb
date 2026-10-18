# Minimal mock of the SketchUp Ruby API - enough to run the furniture scripts outside SketchUp.
# Records geometry (polygon + extrusion, or triangles), materials, tags and faces marked as "no edge banding".
class Numeric
  def mm; to_f; end
  def to_mm; to_f; end
  def degrees; self * Math::PI / 180.0; end
end

module Geom
  class Point3d
    attr_reader :x, :y, :z
    def initialize(x = 0, y = 0, z = 0); @x, @y, @z = x.to_f, y.to_f, z.to_f; end
    def to_a; [@x, @y, @z]; end
  end
  class Vector3d
    attr_reader :a
    def initialize(*a); @a = a.flatten.map(&:to_f); end
    def x; @a[0]; end
    def y; @a[1]; end
    def z; @a[2]; end
    def angle_between(_o); 0.0; end
  end
  # Affine matrix: columns xv, yv, zv + translation o.
  class Transformation
    attr_reader :m
    def initialize(m = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]]); @m = m; end
    def self.axes(o, x, y, z); new([x.a, y.a, z.a, o.to_a]); end
    def self.translation(v); v = v.respond_to?(:to_a) ? v.to_a : v; new([[1, 0, 0], [0, 1, 0], [0, 0, 1], v.map(&:to_f)]); end
    def app(p); x, y, z = p; xv, yv, zv, o = @m; [0, 1, 2].map { |i| o[i] + x * xv[i] + y * yv[i] + z * zv[i] }; end
    def rot(v); x, y, z = v; xv, yv, zv, = @m; [0, 1, 2].map { |i| x * xv[i] + y * yv[i] + z * zv[i] }; end
    def *(o)
      if o.is_a?(Transformation)
        xv, yv, zv, oo = o.m
        Transformation.new([rot(xv), rot(yv), rot(zv), app(oo)])
      else
        Geom::Point3d.new(*app(o.to_a))
      end
    end
  end
end

module Sketchup
  class Color
    attr_reader :rgb
    def initialize(*a); @rgb = a.flatten.first(3).map(&:to_i); end
  end
  class Edge; end
  Normal = Struct.new(:x, :y, :z)

  # Solid face: normal + material (apply_band paints it RAW when the edge has no banding).
  class Face
    attr_accessor :material, :back_material
    attr_reader :pts, :side
    def initialize(group, pts, side = nil); @g = group; @pts = pts.map(&:to_a); @side = side; end
    def normal
      @n ||= begin
        a, b, c = @pts[0], @pts[1], @pts[2]
        u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
        n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
        l = Math.sqrt(n.sum { |q| q * q }); l = 1.0 if l.zero?
        n.map { |q| q / l }
      end
      Normal.new(*@n)
    end
    def set_normal(n); @n = n; end
    def reverse!; normal; @n = @n.map { |q| -q }; @pts = @pts.reverse; self; end
    def edges; []; end
    def pushpull(d)
      normal
      off = @n.map { |q| q * d }
      @g.solid = { base: @pts.map(&:dup), off: off }
      @g.build_faces
    end
  end

  class Ents
    attr_reader :groups, :faces
    def initialize(owner); @owner = owner; @groups = []; @faces = []; end
    def add_group; g = G.new(@owner); @groups << g; g; end
    def add_face(*pts)
      pts = pts.flatten if pts.first.is_a?(Array) && pts.first.first.is_a?(Geom::Point3d)
      f = Face.new(@owner, pts)
      @faces << f
      f
    end
    def grep(c)
      return @owner ? @owner.solid_faces : [] if c == Sketchup::Face
      []
    end
    def each(&b); @groups.each(&b); end
  end

  class G
    attr_accessor :name, :material, :layer, :parent, :solid, :t
    attr_reader :solid_faces
    def initialize(parent); @parent = parent; @t = Geom::Transformation.new; @solid_faces = []; end
    def entities; @e ||= Ents.new(self); end
    def transform!(tr); @t = tr * @t; self; end
    def transformation; @t; end
    def deleted?; @deleted == true; end
    def erase!
      @deleted = true
      (@parent ? @parent.entities.groups : Sketchup.active_model.active_entities.groups).delete(self)
    end
    # 2 bases + side faces, normals pointing outwards (for apply_band).
    def build_faces
      base = @solid[:base]; off = @solid[:off]
      top = base.map { |p| [p[0] + off[0], p[1] + off[1], p[2] + off[2]] }
      d = Math.sqrt(off.sum { |q| q * q }); n = off.map { |q| q / d }
      f0 = Face.new(self, base, :base); f0.set_normal(n.map { |q| -q })
      f1 = Face.new(self, top, :top); f1.set_normal(n)
      @solid_faces = [f0, f1]
      cx = base.transpose.map { |c| c.sum / c.size }
      base.each_with_index do |p, i|
        q = base[(i + 1) % base.size]
        e = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]
        sn = [e[1] * n[2] - e[2] * n[1], e[2] * n[0] - e[0] * n[2], e[0] * n[1] - e[1] * n[0]]
        l = Math.sqrt(sn.sum { |s| s * s }); next if l.zero?
        sn = sn.map { |s| s / l }
        mid = [(p[0] + q[0]) / 2 - cx[0], (p[1] + q[1]) / 2 - cx[1], (p[2] + q[2]) / 2 - cx[2]]
        sn = sn.map { |s| -s } if sn.zip(mid).sum { |a, b| a * b } < 0
        f = Face.new(self, [p, q], i); f.set_normal(sn)
        @solid_faces << f
      end
    end
  end

  class Mat
    attr_accessor :name, :color, :alpha
    def initialize(n); @name = n; @alpha = 1.0; end
  end
  class Mats
    def initialize; @h = {}; end
    def [](n); @h[n]; end
    def add(n); @h[n] = Mat.new(n); end
  end
  class Layer
    attr_accessor :name, :folder
    def initialize(n); @name = n; end
  end
  class Folder
    attr_reader :name
    def initialize(n); @name = n; end
  end
  class Lays
    def initialize; @h = {}; @folders = []; end
    def [](n); @h[n]; end
    def add(n); @h[n] = Layer.new(n); end
    def add_folder(n); f = Folder.new(n); @folders << f; f; end
    def folders; @folders; end
  end
  class Model
    def materials; @m ||= Mats.new; end
    def layers; @l ||= Lays.new; end
    def active_entities; @ae ||= Ents.new(nil); end
    def entities; active_entities; end
    def start_operation(*); end
    def commit_operation; end
  end
  def self.active_model; @mo ||= Model.new; end
  def self.reset!; @mo = Model.new; end
end
