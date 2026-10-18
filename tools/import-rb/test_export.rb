require 'minitest/autorun'
require 'json'
require 'tmpdir'

class ExportTest < Minitest::Test
  ROOT = File.expand_path('../..', __dir__)
  def export(src, id)
    out = File.join(Dir.tmpdir, "#{id}.json")
    ok = system('ruby', File.join(ROOT, 'tools/import-rb/export.rb'), File.join(ROOT, 'sources/sketchup', src), id, id, out, err: File::NULL)
    assert ok, "export of #{src} failed"
    JSON.parse(File.read(out))
  end

  def test_kitchen_part_count_and_g3_door
    m = export('kitchen-in-room.rb', 'kitchen')
    boards = m['parts'].reject { |p| p['shape']['type'] == 'mesh' }
    assert_equal 242, boards.size                   # matches the quoted cut list (211) + 31 handles
    d = m['parts'].find { |p| p['name'].start_with?('G3 Drzwi') }
    mn, mx = d['shape']['min'], d['shape']['max']
    assert_equal [596.0, 18.0, 896.0], (0..2).map { |i| (mx[i] - mn[i]).round(1) }
    assert_equal 'front', d['layer']
  end

  def test_tv_cabinet_three_doors
    m = export('tv-cabinet-b.rb', 'tv-cabinet')
    assert_equal 3, m['parts'].count { |p| p['layer'] == 'front' }
    assert_equal ['RTV K1', 'RTV K2', 'RTV K3'], m['parts'].map { |p| p['unit'] }.grep(/RTV K/).uniq.sort
  end

  def test_edge_banding_of_second_panel
    m = export('kitchen-in-room.rb', 'kitchen')
    p = m['parts'].find { |x| x['name'].start_with?('Druga plyta') }
    assert_equal 'extrude', p['shape']['type']
    assert_includes p['edges']['raw'], 'z-'         # bottom edge not banded
  end
end
