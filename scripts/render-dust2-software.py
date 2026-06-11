#!/usr/bin/env python3
import json
import math
import os
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
RESOURCE_JSON = os.environ.get("DUST2_RESOURCE_JSON")
OUT_DIR = ROOT / "scripts/screenshots"
WIDTH = 960
HEIGHT = 640
FOV = math.radians(74)
NEAR = 0.08


LOCATIONS = [
    ("source-01-t-spawn", (-8.2, 3.6, 8.0), (-3.2, 1.6, -11.8)),
    ("source-02-outside-long-long-doors", (-16.5, 2.8, 4.5), (-19.8, 1.8, -8.5)),
    ("source-03-long-doors", (-19.8, 2.6, -8.5), (-19.4, 1.8, -18.0)),
    ("source-04-a-long-pit-long-corner", (-19.4, 2.6, -18.5), (-16.4, 1.8, -25.6)),
    ("source-05-a-cross-a-ramp", (-16.4, 2.8, -23.8), (-14.8, 1.8, -26.8)),
    ("source-06-a-site-goose-short-exit", (-15.0, 3.0, -26.6), (-10.0, 1.8, -15.0)),
    ("source-07-short-catwalk-to-a", (-9.6, 2.8, -15.1), (-15.0, 1.8, -26.5)),
    ("source-08-top-mid-suicide-mid-doors", (-5.8, 2.8, 3.8), (-3.2, 1.8, -11.8)),
    ("source-09-mid-doors-ct-mid", (-3.2, 2.6, -11.8), (2.5, 1.4, -22.4)),
    ("source-10-xbox-catwalk-short", (-7.5, 2.8, -8.8), (-10.0, 1.8, -15.2)),
    ("source-11-lower-tunnels", (5.2, 2.6, -5.1), (12.8, 1.8, -1.5)),
    ("source-12-upper-tunnels-b-exit", (12.8, 2.7, -1.5), (11.2, 1.8, -23.6)),
    ("source-13-b-site-default-back-plat", (11.4, 3.0, -24.6), (12.4, 1.8, -25.4)),
    ("source-14-b-doors-b-window", (7.0, 2.7, -21.2), (11.4, 1.8, -24.6)),
    ("source-15-ct-spawn-ct-mid", (2.5, 1.9, -22.4), (-3.2, 1.7, -11.8)),
]


def main():
    resource = read_resource()
    positions = [tuple(map(float, point)) for point in resource["mesh"]["positions"]]
    indices = resource["mesh"]["indices"]
    triangles = [(positions[indices[i]], positions[indices[i + 1]], positions[indices[i + 2]]) for i in range(0, len(indices), 3)]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(json.dumps({
        "sourcePath": resource["source"]["path"],
        "vertexCount": len(positions),
        "triangleCount": len(triangles),
        "screenshotCount": len(LOCATIONS),
    }, ensure_ascii=False, indent=2))

    for name, eye, target in LOCATIONS:
        path = OUT_DIR / f"dust2-{name}.png"
        render_scene(triangles, eye, target, name).save(path)
        print(path)
    plan_path = write_topdown_plan(triangles)
    print(plan_path)
    comparison_path = write_overview_comparison(plan_path)
    if comparison_path:
        print(comparison_path)
    contact_sheet = write_contact_sheet()
    print(contact_sheet)


def read_resource():
    if not RESOURCE_JSON:
        raise RuntimeError("DUST2_RESOURCE_JSON is required; use npm run dust2:render so the resource is built from the source BSP.")
    return json.loads(Path(RESOURCE_JSON).read_text(encoding="utf-8"))


def render_scene(triangles, eye, target, label):
    image = Image.new("RGB", (WIDTH, HEIGHT), (18, 22, 25))
    draw = ImageDraw.Draw(image)
    depth = [float("inf")] * (WIDTH * HEIGHT)
    camera = make_camera(eye, target)

    # Far atmospheric bands help show orientation without inventing geometry.
    draw.rectangle((0, 0, WIDTH, HEIGHT // 2), fill=(34, 43, 48))
    draw.rectangle((0, HEIGHT // 2, WIDTH, HEIGHT), fill=(23, 25, 24))

    for tri in triangles:
        camera_poly = [(world_to_camera(point, camera), point) for point in tri]
        clipped = clip_polygon_near(camera_poly)
        if len(clipped) < 3:
            continue
        projected = [(project_camera(point[0], camera), point[1]) for point in clipped]
        if any(point[0] is None for point in projected):
            continue
        raster_polygon(image, depth, projected, tri)

    draw.rectangle((0, 0, WIDTH, 34), fill=(0, 0, 0))
    draw.text((12, 9), label.replace("source-", "CS1.6 BSP "), fill=(236, 224, 190))
    return image


def write_contact_sheet():
    paths = sorted(path for path in OUT_DIR.glob("dust2-source-*.png") if path.name[len("dust2-source-"):len("dust2-source-") + 2].isdigit())
    thumb_width, thumb_height = 320, 213
    sheet = Image.new("RGB", (thumb_width * 3, (thumb_height + 28) * 5), (20, 20, 20))
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(paths[:15]):
        image = Image.open(path).resize((thumb_width, thumb_height))
        x = (index % 3) * thumb_width
        y = (index // 3) * (thumb_height + 28)
        sheet.paste(image, (x, y))
        draw.text((x + 6, y + thumb_height + 6), path.stem.replace("dust2-source-", ""), fill=(240, 220, 180))

    contact_sheet_path = OUT_DIR / "dust2-source-contact-sheet.png"
    sheet.save(contact_sheet_path)
    return contact_sheet_path


def write_topdown_plan(triangles):
    width, height = 1600, 1180
    all_points = [point for tri in triangles for point in tri]
    min_x = min(point[0] for point in all_points)
    max_x = max(point[0] for point in all_points)
    min_z = min(point[2] for point in all_points)
    max_z = max(point[2] for point in all_points)
    margin = 1.2
    scale = min((width - 80) / (max_x - min_x + margin * 2), (height - 90) / (max_z - min_z + margin * 2))

    image = Image.new("RGB", (width, height), (18, 22, 25))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, width, 42), fill=(0, 0, 0))
    draw.text((14, 13), "CS1.6 de_dust2 BSP top-down structure: render mesh projected from imported source", fill=(238, 224, 190))

    def to_screen(point):
      x, _, z = point
      sx = 40 + (x - min_x + margin) * scale
      sy = 55 + (max_z - z + margin) * scale
      return (sx, sy)

    # Draw walls and vertical faces first; draw walkable-ish planes brighter on top.
    sorted_tris = sorted(triangles, key=lambda tri: abs(triangle_normal(tri)[1]))
    for tri in sorted_tris:
        normal = triangle_normal(tri)
        avg_y = sum(point[1] for point in tri) / 3
        pts = [to_screen(point) for point in tri]
        if abs(normal[1]) > 0.62:
            shade = max(0.35, min(1.0, 0.48 + avg_y * 0.05))
            color = (int(190 * shade), int(174 * shade), int(132 * shade))
            draw.polygon(pts, fill=color)
        else:
            draw.line([*pts, pts[0]], fill=(82, 77, 61), width=1)

    routes = [
        ("Long -> A", (255, 186, 86), [(-8.2, 8.0), (-17.18, -9.39), (-19.4, -18.5), (-16.4, -23.8), (-15.36, -26.88)]),
        ("Short -> A", (100, 206, 255), [(-8.2, 8.0), (-5.8, 3.8), (-7.5, -8.8), (-9.6, -15.1), (-15.36, -26.88)]),
        ("Tunnels -> B", (148, 235, 132), [(-8.2, 8.0), (-4.7, 3.7), (5.2, -5.1), (12.8, -1.5), (11.2, -23.6), (11.52, -24.64)]),
        ("CT -> Mid", (230, 122, 255), [(2.56, -22.4), (-0.53, -20.05), (-3.2, -11.8)]),
        ("CT -> B", (230, 122, 255), [(2.56, -22.4), (7.0, -21.2), (11.52, -24.64)]),
        ("CT -> A", (230, 122, 255), [(2.56, -22.4), (-13.8, -25.2), (-15.36, -26.88)]),
    ]
    for label, color, route in routes:
        points = [to_screen((x, 0, z)) for x, z in route]
        draw.line(points, fill=color, width=4, joint="curve")
        sx, sy = points[min(1, len(points) - 1)]
        draw.text((sx + 8, sy + 8), label, fill=color)

    labels = [
        ("T spawn", (-8.2, 8.0)),
        ("Long doors", (-19.8, -8.5)),
        ("A long / pit", (-19.4, -18.5)),
        ("A site", (-15.0, -26.6)),
        ("Short", (-9.6, -15.1)),
        ("Top mid", (-5.8, 3.8)),
        ("Mid doors", (-3.2, -11.8)),
        ("Lower tunnels", (5.2, -5.1)),
        ("Upper tunnels", (12.8, -1.5)),
        ("A ramp", (-13.8, -25.2)),
        ("B doors/window", (7.0, -21.2)),
        ("B site", (11.4, -24.6)),
        ("CT spawn", (2.5, -22.4)),
    ]
    for label, (x, z) in labels:
        sx, sy = to_screen((x, 0, z))
        draw.ellipse((sx - 5, sy - 5, sx + 5, sy + 5), fill=(255, 220, 90), outline=(0, 0, 0))
        draw.text((sx + 8, sy - 7), label, fill=(245, 234, 190))

    path = OUT_DIR / "dust2-source-plan.png"
    image.save(path)
    return path


def write_overview_comparison(plan_path):
    overview_path = ROOT / ".external/cs16-hlds/cstrike/overviews/de_dust2.bmp"
    if not overview_path.exists():
        return None

    reference = Image.open(overview_path).convert("RGB")
    reference.thumbnail((760, 760))
    plan = Image.open(plan_path).convert("RGB")
    plan.thumbnail((760, 760))

    width = reference.width + plan.width + 36
    height = max(reference.height, plan.height) + 58
    sheet = Image.new("RGB", (width, height), (20, 20, 20))
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 12), "left: CS1.6 overview BMP / right: imported BSP top-down mesh", fill=(240, 224, 190))
    sheet.paste(reference, (12, 46))
    sheet.paste(plan, (reference.width + 24, 46))
    path = OUT_DIR / "dust2-source-overview-comparison.png"
    sheet.save(path)
    return path


def make_camera(eye, target):
    forward = normalize(sub(target, eye))
    right = normalize(cross(forward, (0, 1, 0)))
    up = cross(right, forward)
    return {"eye": eye, "forward": forward, "right": right, "up": up, "focal": (WIDTH / 2) / math.tan(FOV / 2)}


def world_to_camera(point, camera):
    rel = sub(point, camera["eye"])
    return (
        dot(rel, camera["right"]),
        dot(rel, camera["up"]),
        dot(rel, camera["forward"]),
    )


def project_camera(point, camera):
    x, y, z = point
    if z <= NEAR:
        return None
    sx = WIDTH / 2 + (x / z) * camera["focal"]
    sy = HEIGHT / 2 - (y / z) * camera["focal"]
    return (sx, sy, z)


def clip_polygon_near(points):
    clipped = []
    for index, current in enumerate(points):
        previous = points[index - 1]
        current_inside = current[0][2] >= NEAR
        previous_inside = previous[0][2] >= NEAR

        if current_inside != previous_inside:
            clipped.append(intersect_near(previous, current))
        if current_inside:
            clipped.append(current)
    return clipped


def intersect_near(a, b):
    cam_a, world_a = a
    cam_b, world_b = b
    denom = cam_b[2] - cam_a[2]
    t = 0 if abs(denom) < 0.000001 else (NEAR - cam_a[2]) / denom
    return (
        lerp_tuple(cam_a, cam_b, t),
        lerp_tuple(world_a, world_b, t),
    )


def raster_polygon(image, depth, projected, world_tri):
    projected_points = [point[0] for point in projected]
    world_points = [point[1] for point in projected]
    for index in range(1, len(projected_points) - 1):
        raster_triangle(
            image,
            depth,
            [projected_points[0], projected_points[index], projected_points[index + 1]],
            [world_points[0], world_points[index], world_points[index + 1]],
        )

    draw = ImageDraw.Draw(image)
    line = [(point[0], point[1]) for point in projected_points]
    draw.line([*line, line[0]], fill=(88, 78, 58), width=1)


def raster_triangle(image, depth, projected, world_tri):
    min_x = max(0, int(math.floor(min(p[0] for p in projected))))
    max_x = min(WIDTH - 1, int(math.ceil(max(p[0] for p in projected))))
    min_y = max(35, int(math.floor(min(p[1] for p in projected))))
    max_y = min(HEIGHT - 1, int(math.ceil(max(p[1] for p in projected))))
    if min_x > max_x or min_y > max_y:
        return

    area = edge(projected[0], projected[1], projected[2])
    if abs(area) < 0.0001:
        return

    shade = triangle_shade(world_tri)
    color = (int(188 * shade), int(172 * shade), int(132 * shade))
    pixels = image.load()

    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            p = (x + 0.5, y + 0.5, 0)
            w0 = edge(projected[1], projected[2], p) / area
            w1 = edge(projected[2], projected[0], p) / area
            w2 = edge(projected[0], projected[1], p) / area
            if w0 < -0.0001 or w1 < -0.0001 or w2 < -0.0001:
                continue
            z = w0 * projected[0][2] + w1 * projected[1][2] + w2 * projected[2][2]
            idx = y * WIDTH + x
            if z < depth[idx]:
                depth[idx] = z
                pixels[x, y] = color


def triangle_shade(tri):
    normal = triangle_normal(tri)
    light = normalize((-0.35, 0.85, 0.28))
    return max(0.38, min(1.0, 0.50 + abs(dot(normal, light)) * 0.55))


def triangle_normal(tri):
    return normalize(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])))


def edge(a, b, c):
    return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def normalize(v):
    length = math.sqrt(dot(v, v))
    if length <= 0.000001:
        return (0, 0, 0)
    return (v[0] / length, v[1] / length, v[2] / length)


def lerp_tuple(a, b, t):
    return tuple(a[index] + (b[index] - a[index]) * t for index in range(len(a)))


if __name__ == "__main__":
    main()
