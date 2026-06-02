#!/usr/bin/env python3
"""
CSGO 全武器 2D PNG 贴图生成器
为全部 34 种 CSGO 武器生成侧视图 PNG 贴图
暗色背景 + 金色边框 + 武器名称标签
输出到 client/public/assets/icons/weapons-png/
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

# ── 配置 ──────────────────────────────────────────────────────────────────
OUTPUT_DIR = "/Volumes/新/work/html/client/public/assets/icons/weapons-png"
W, H = 208, 96  # 2x 高清尺寸
BG_COLOR = (26, 26, 36)         # #1a1a24
BORDER_COLOR = (184, 148, 62)   # #b8943e 金色
TEXT_COLOR = (200, 200, 210)
DIM_TEXT_COLOR = (120, 120, 140)
WEAPON_METAL = (130, 140, 155)   # 枪身金属灰
WEAPON_DARK = (60, 65, 75)      # 深色部件
WEAPON_WOOD = (90, 60, 35)      # 木色
WEAPON_GRIP = (40, 42, 50)      # 握把深灰
WEAPON_ACCENT = (184, 148, 62)  # 金色点缀
WEAPON_SCOPE = (25, 28, 35)     # 瞄准镜黑

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── 画布初始化 ────────────────────────────────────────────────────────────
def new_canvas():
    img = Image.new("RGBA", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)
    # 金色边框
    draw.rectangle([0, 0, W - 1, H - 1], outline=BORDER_COLOR, width=2)
    return img, draw

def save(img, name):
    path = os.path.join(OUTPUT_DIR, f"{name}.png")
    img.save(path, "PNG")
    print(f"  ✓ {name}.png")

# ── 绘制辅助函数 ──────────────────────────────────────────────────────────
def rect(draw, xy, fill):
    """绘制矩形"""
    x1, y1, x2, y2 = xy
    draw.rectangle([x1, y1, x2, y2], fill=fill)

def rounded_rect(draw, xy, radius, fill):
    """绘制圆角矩形"""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill)

def barrel(draw, x, y, length, height=6, fill=WEAPON_METAL):
    """绘制枪管（水平圆柱）"""
    rect(draw, (x, y - height // 2, x + length, y + height // 2), fill)

def grip(draw, x, y, w, h, angle=15, fill=WEAPON_GRIP):
    """绘制握把（倾斜矩形）"""
    rad = math.radians(angle)
    tips = [
        (x, y),
        (x + w, y),
        (x + w + h * math.tan(rad), y + h),
        (x + h * math.tan(rad), y + h),
    ]
    draw.polygon(tips, fill=fill)

def mag_curved(draw, x, y, w, h, curve=8, fill=WEAPON_DARK):
    """绘制弯弹匣（AK风格）"""
    for i in range(6):
        seg_y = y + i * (h / 6)
        offset = i * curve // 6
        rect(draw, (x - offset, seg_y, x + w, seg_y + h / 6), fill)

def mag_straight(draw, x, y, w, h, fill=WEAPON_DARK):
    """绘制直弹匣"""
    rect(draw, (x, y, x + w, y + h), fill)

def suppressor(draw, x, y, length, height=8, fill=WEAPON_DARK):
    """绘制消音器"""
    rounded_rect(draw, (x, y - height // 2, x + length, y + height // 2), 3, fill)

def scope(draw, x, y, w, h, fill=WEAPON_SCOPE):
    """绘制瞄准镜"""
    rect(draw, (x, y, x + w, y + h), fill)
    # 镜片亮光
    draw.ellipse([x + w - h, y, x + w, y + h], fill=(40, 60, 90))

def text_label(draw, name, x=None, y=82):
    """绘制武器名称标签"""
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 10)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/STHeiti Light.ttc", 10)
        except:
            font = ImageFont.load_default()
    if x is None:
        bbox = draw.textbbox((0, 0), name, font=font)
        x = (W - (bbox[2] - bbox[0])) // 2
    draw.text((x, y), name, fill=TEXT_COLOR, font=font)

def category_mark(draw, x, cat_color):
    """绘制左下角类别标记点"""
    draw.ellipse([x, H - 14, x + 6, H - 8], fill=cat_color)

# ══════════════════════════════════════════════════════════════════════════
#  手枪类 (Pistols)
# ══════════════════════════════════════════════════════════════════════════

def draw_glock():
    """Glock-18: 紧凑方形滑套 + 梯形握把"""
    img, d = new_canvas()
    # 滑套
    rect(d, (30, 34, 130, 46), WEAPON_METAL)
    # 枪管（短，从滑套前端伸出）
    barrel(d, 128, 40, 22, 4, WEAPON_METAL)
    # 扳机护圈
    rounded_rect(d, (55, 44, 78, 58), 4, WEAPON_DARK)
    # 握把
    grip(d, 55, 56, 30, 24, 12, WEAPON_GRIP)
    # 弹匣底板
    rect(d, (55, 76, 95, 80), WEAPON_DARK)
    # 准星
    rect(d, (140, 34, 145, 37), WEAPON_METAL)
    text_label(d, "Glock-18")
    category_mark(d, 4, (100, 180, 100))
    save(img, "glock")

def draw_usp_s():
    """USP-S: 消音器 + 短滑套"""
    img, d = new_canvas()
    suppressor(d, 135, 40, 30, 6, WEAPON_DARK)
    rect(d, (30, 34, 135, 46), WEAPON_METAL)
    barrel(d, 100, 40, 40, 4, WEAPON_METAL)
    rounded_rect(d, (50, 44, 72, 58), 4, WEAPON_DARK)
    grip(d, 50, 56, 28, 24, 10, WEAPON_GRIP)
    rect(d, (120, 36, 128, 44), WEAPON_DARK)  # 抛壳窗
    text_label(d, "USP-S")
    category_mark(d, 4, (100, 180, 100))
    save(img, "usp_s")

def draw_p250():
    """P250: 紧凑型"""
    img, d = new_canvas()
    rect(d, (30, 35, 125, 47), WEAPON_METAL)
    barrel(d, 123, 41, 18, 4, WEAPON_METAL)
    rounded_rect(d, (50, 45, 72, 58), 4, WEAPON_DARK)
    grip(d, 50, 56, 26, 22, 14, WEAPON_GRIP)
    text_label(d, "P250")
    category_mark(d, 4, (100, 180, 100))
    save(img, "p250")

def draw_five_seven():
    """Five-SeveN: 长滑套 + 细握把"""
    img, d = new_canvas()
    rect(d, (25, 34, 138, 46), WEAPON_METAL)
    barrel(d, 136, 40, 20, 4, WEAPON_METAL)
    rounded_rect(d, (55, 44, 76, 58), 4, WEAPON_DARK)
    grip(d, 55, 56, 26, 24, 8, WEAPON_GRIP)
    # 滑套防滑纹
    for i in range(4):
        d.line([(108 + i * 5, 36), (108 + i * 5, 45)], fill=WEAPON_DARK, width=1)
    text_label(d, "Five-SeveN")
    category_mark(d, 4, (100, 180, 100))
    save(img, "five_seven")

def draw_deagle():
    """Desert Eagle: 大型手枪"""
    img, d = new_canvas()
    rect(d, (20, 30, 140, 48), WEAPON_METAL)
    barrel(d, 138, 40, 22, 5, WEAPON_METAL)
    # 大型滑套
    rect(d, (25, 30, 140, 38), WEAPON_METAL)
    rounded_rect(d, (55, 46, 80, 62), 4, WEAPON_DARK)
    grip(d, 53, 56, 30, 26, 12, WEAPON_GRIP)
    # 制退器端口
    rect(d, (138, 30, 148, 48), WEAPON_DARK)
    text_label(d, "Desert Eagle")
    category_mark(d, 4, (180, 100, 100))
    save(img, "deagle")

def draw_dual_berettas():
    """Dual Berettas: 双枪交错"""
    img, d = new_canvas()
    # 上枪
    rect(d, (28, 28, 110, 40), WEAPON_METAL)
    barrel(d, 108, 34, 18, 4, WEAPON_METAL)
    grip(d, 48, 38, 22, 20, 12, WEAPON_GRIP)
    # 下枪
    rect(d, (40, 44, 120, 56), WEAPON_METAL)
    barrel(d, 118, 50, 18, 4, WEAPON_METAL)
    grip(d, 60, 52, 22, 20, 12, WEAPON_GRIP)
    text_label(d, "Dual Berettas")
    category_mark(d, 4, (100, 180, 100))
    save(img, "dual_berettas")

def draw_r8():
    """R8 Revolver: 转轮"""
    img, d = new_canvas()
    rect(d, (30, 34, 115, 46), WEAPON_METAL)
    barrel(d, 113, 40, 25, 5, WEAPON_METAL)
    # 转轮
    d.ellipse([70, 42, 90, 58], fill=WEAPON_DARK, outline=WEAPON_METAL, width=1)
    grip(d, 45, 56, 28, 22, 14, WEAPON_WOOD)
    text_label(d, "R8 Revolver")
    category_mark(d, 4, (180, 100, 100))
    save(img, "r8")

def draw_cz75():
    """CZ75-Auto: 紧凑全自动手枪"""
    img, d = new_canvas()
    rect(d, (32, 35, 128, 47), WEAPON_METAL)
    barrel(d, 126, 41, 18, 4, WEAPON_METAL)
    rounded_rect(d, (52, 45, 74, 58), 4, WEAPON_DARK)
    grip(d, 52, 56, 26, 22, 14, WEAPON_GRIP)
    # 前置握把延长（CZ75特色）
    rect(d, (100, 44, 112, 58), WEAPON_DARK)
    text_label(d, "CZ75-Auto")
    category_mark(d, 4, (100, 180, 100))
    save(img, "cz75")

def draw_tec9():
    """Tec-9: T方大弹匣手枪"""
    img, d = new_canvas()
    rect(d, (28, 34, 132, 46), WEAPON_METAL)
    barrel(d, 130, 40, 18, 4, WEAPON_METAL)
    rounded_rect(d, (52, 44, 74, 58), 4, WEAPON_DARK)
    grip(d, 50, 56, 28, 22, 14, WEAPON_GRIP)
    # 大型弹匣
    rect(d, (62, 56, 88, 80), WEAPON_DARK)
    text_label(d, "Tec-9")
    category_mark(d, 4, (100, 180, 100))
    save(img, "tec9")

def draw_p2000():
    """P2000: 标准手枪"""
    img, d = new_canvas()
    rect(d, (30, 34, 128, 46), WEAPON_METAL)
    barrel(d, 126, 40, 18, 4, WEAPON_METAL)
    rounded_rect(d, (52, 44, 74, 58), 4, WEAPON_DARK)
    grip(d, 50, 56, 28, 22, 14, WEAPON_GRIP)
    # 滑套释放钮
    rect(d, (62, 36, 72, 43), WEAPON_DARK)
    text_label(d, "P2000")
    category_mark(d, 4, (100, 180, 100))
    save(img, "p2000")

# ══════════════════════════════════════════════════════════════════════════
#  微型冲锋枪类 (SMGs)
# ══════════════════════════════════════════════════════════════════════════

def draw_mp9():
    """MP9: CT方微型SMG — T形布局 + 顶部弹匣"""
    img, d = new_canvas()
    # 机匣
    rect(d, (25, 38, 130, 52), WEAPON_METAL)
    # 短枪管
    barrel(d, 128, 45, 16, 5, WEAPON_METAL)
    # 顶部弹匣（MP9特色）
    mag_straight(d, 55, 26, 10, 14, WEAPON_DARK)
    # 握把
    grip(d, 55, 50, 22, 28, 12, WEAPON_GRIP)
    # 前握把
    grip(d, 105, 50, 16, 20, 8, WEAPON_DARK)
    # 折叠托
    rect(d, (25, 40, 35, 50), WEAPON_DARK)
    text_label(d, "MP9")
    category_mark(d, 4, (100, 150, 200))
    save(img, "mp9")

def draw_mac10():
    """MAC-10: T方SMG — 方形机匣 + 长弹匣"""
    img, d = new_canvas()
    rect(d, (28, 38, 130, 52), WEAPON_METAL)
    barrel(d, 128, 45, 18, 5, WEAPON_METAL)
    # 长直弹匣
    mag_straight(d, 60, 52, 12, 28, WEAPON_DARK)
    grip(d, 55, 50, 22, 24, 14, WEAPON_GRIP)
    # 枪口补偿器
    rect(d, (128, 43, 150, 50), WEAPON_DARK)
    text_label(d, "MAC-10")
    category_mark(d, 4, (100, 150, 200))
    save(img, "mac10")

def draw_pp_bizon():
    """PP-Bizon: 螺旋弹筒"""
    img, d = new_canvas()
    rect(d, (30, 38, 120, 52), WEAPON_METAL)
    barrel(d, 118, 45, 20, 5, WEAPON_METAL)
    # 螺旋弹筒（圆形）
    d.ellipse([65, 44, 95, 74], fill=WEAPON_DARK, outline=WEAPON_METAL, width=1)
    # 弹筒纹路
    d.ellipse([68, 47, 92, 71], fill=WEAPON_DARK)
    grip(d, 48, 56, 20, 24, 12, WEAPON_GRIP)
    text_label(d, "PP-Bizon")
    category_mark(d, 4, (100, 150, 200))
    save(img, "pp_bizon")

def draw_mp7():
    """MP7: 紧凑SMG + 前握把"""
    img, d = new_canvas()
    rect(d, (28, 38, 128, 52), WEAPON_METAL)
    barrel(d, 126, 45, 18, 5, WEAPON_METAL)
    # 顶部导轨
    rect(d, (40, 33, 115, 38), WEAPON_DARK)
    # 弹匣
    mag_straight(d, 62, 52, 10, 24, WEAPON_DARK)
    grip(d, 52, 50, 20, 24, 12, WEAPON_GRIP)
    # 前握把
    rect(d, (100, 46, 114, 60), WEAPON_DARK)
    # 折叠托
    rect(d, (28, 38, 38, 50), WEAPON_DARK)
    text_label(d, "MP7")
    category_mark(d, 4, (100, 150, 200))
    save(img, "mp7")

def draw_ump45():
    """UMP-45: .45口径SMG — 直弹匣"""
    img, d = new_canvas()
    rect(d, (25, 38, 130, 52), WEAPON_METAL)
    barrel(d, 128, 45, 18, 5, WEAPON_METAL)
    # 直弹匣（UMP特色）
    mag_straight(d, 66, 50, 10, 26, WEAPON_DARK)
    grip(d, 52, 50, 20, 24, 12, WEAPON_GRIP)
    # 固定托
    rect(d, (22, 38, 32, 52), WEAPON_DARK)
    rect(d, (18, 40, 26, 54), WEAPON_GRIP)
    text_label(d, "UMP-45")
    category_mark(d, 4, (100, 150, 200))
    save(img, "ump45")

def draw_p90():
    """P90: 顶部弹匣PDW"""
    img, d = new_canvas()
    rect(d, (28, 40, 136, 54), WEAPON_METAL)
    barrel(d, 134, 47, 16, 5, WEAPON_METAL)
    # 顶部水平弹匣（P90标志特征）
    rect(d, (50, 30, 120, 40), WEAPON_DARK)
    # 拇指孔握把
    rect(d, (90, 52, 108, 70), WEAPON_GRIP)
    grip(d, 55, 54, 22, 20, 10, WEAPON_GRIP)
    text_label(d, "P90")
    category_mark(d, 4, (100, 150, 200))
    save(img, "p90")

def draw_mp5sd():
    """MP5-SD: 一体消音器SMG"""
    img, d = new_canvas()
    # 一体消音器
    suppressor(d, 118, 45, 28, 10, WEAPON_DARK)
    rect(d, (25, 38, 120, 52), WEAPON_METAL)
    barrel(d, 100, 45, 22, 5, WEAPON_METAL)
    # 弹匣
    mag_straight(d, 62, 52, 10, 24, WEAPON_DARK)
    grip(d, 50, 50, 20, 24, 12, WEAPON_GRIP)
    # 固定托
    rect(d, (22, 38, 32, 54), WEAPON_DARK)
    text_label(d, "MP5-SD")
    category_mark(d, 4, (100, 150, 200))
    save(img, "mp5sd")

# ══════════════════════════════════════════════════════════════════════════
#  步枪类 (Rifles)
# ══════════════════════════════════════════════════════════════════════════

def draw_ak47():
    """AK-47: 弯弹匣 + 木色护木"""
    img, d = new_canvas()
    # 机匣
    rect(d, (20, 34, 130, 50), WEAPON_METAL)
    # 枪管
    barrel(d, 128, 44, 38, 6, WEAPON_METAL)
    # 斜切制退器
    rect(d, (160, 40, 172, 50), WEAPON_DARK)
    # 导气管
    rect(d, (128, 34, 158, 38), WEAPON_METAL)
    # 木色护木
    rect(d, (96, 40, 130, 54), WEAPON_WOOD)
    # 弯弹匣
    mag_curved(d, 50, 50, 14, 30, 10, WEAPON_DARK)
    # 手枪握把（木色）
    grip(d, 42, 52, 22, 24, 14, WEAPON_WOOD)
    # 枪托
    rect(d, (18, 36, 26, 52), WEAPON_WOOD)
    # 照门
    rect(d, (72, 30, 82, 34), WEAPON_DARK)
    # 准星
    rect(d, (134, 30, 140, 36), WEAPON_DARK)
    text_label(d, "AK-47")
    category_mark(d, 4, (220, 150, 80))
    save(img, "ak47")

def draw_m4a1s():
    """M4A1-S: 消音器 + 直弹匣 + 提把"""
    img, d = new_canvas()
    # 消音器
    suppressor(d, 140, 42, 32, 10, WEAPON_DARK)
    rect(d, (22, 34, 142, 50), WEAPON_METAL)
    barrel(d, 118, 44, 25, 5, WEAPON_METAL)
    # 提把
    rect(d, (55, 24, 78, 36), WEAPON_METAL)
    rect(d, (58, 18, 74, 24), WEAPON_DARK)
    # 直弹匣
    mag_straight(d, 62, 50, 10, 26, WEAPON_DARK)
    grip(d, 42, 50, 20, 24, 12, WEAPON_GRIP)
    # M4伸缩托
    rect(d, (18, 36, 30, 52), WEAPON_DARK)
    rect(d, (12, 38, 20, 54), WEAPON_GRIP)
    text_label(d, "M4A1-S")
    category_mark(d, 4, (220, 150, 80))
    save(img, "m4a1s")

def draw_m4a4():
    """M4A4: 无消音器 + 四面轨 + 直弹匣"""
    img, d = new_canvas()
    rect(d, (22, 34, 148, 50), WEAPON_METAL)
    barrel(d, 128, 44, 22, 5, WEAPON_METAL)
    # 火帽
    rect(d, (148, 40, 160, 50), WEAPON_DARK)
    # 提把
    rect(d, (55, 24, 78, 36), WEAPON_METAL)
    rect(d, (58, 18, 74, 24), WEAPON_DARK)
    # 四面轨护木（比M4A1-S更方）
    rect(d, (90, 38, 128, 52), WEAPON_DARK)
    # 导轨线
    for i in range(3):
        d.line([(92 + i * 12, 40), (92 + i * 12, 50)], fill=WEAPON_METAL, width=1)
    mag_straight(d, 60, 50, 10, 26, WEAPON_DARK)
    grip(d, 40, 50, 20, 24, 12, WEAPON_GRIP)
    rect(d, (16, 36, 28, 52), WEAPON_DARK)
    rect(d, (10, 38, 18, 54), WEAPON_GRIP)
    text_label(d, "M4A4")
    category_mark(d, 4, (220, 150, 80))
    save(img, "m4a4")

def draw_famas():
    """FAMAS: 无托式 + 提把"""
    img, d = new_canvas()
    # 长机匣（无托）
    rect(d, (18, 38, 145, 52), WEAPON_METAL)
    barrel(d, 143, 45, 22, 5, WEAPON_METAL)
    # 大型提把（FAMAS标志）
    rect(d, (40, 24, 100, 38), WEAPON_METAL)
    rect(d, (45, 20, 95, 24), WEAPON_DARK)
    # 提把孔
    for i in range(4):
        d.rectangle([(48 + i * 12, 26), (56 + i * 12, 32)], fill=WEAPON_DARK)
    # 弹匣（后置，无托特征）
    mag_straight(d, 110, 50, 10, 26, WEAPON_DARK)
    # 握把
    grip(d, 100, 52, 18, 22, 14, WEAPON_GRIP)
    # 枪托（与机匣一体）
    rect(d, (14, 40, 22, 56), WEAPON_GRIP)
    rect(d, (8, 42, 16, 58), WEAPON_DARK)
    text_label(d, "FAMAS")
    category_mark(d, 4, (220, 150, 80))
    save(img, "famas")

def draw_galil():
    """Galil AR: 弯弹匣 + 折叠托"""
    img, d = new_canvas()
    rect(d, (22, 35, 138, 50), WEAPON_METAL)
    barrel(d, 136, 44, 28, 5, WEAPON_METAL)
    # 枪口装置
    rect(d, (162, 40, 174, 48), WEAPON_DARK)
    # 导气管
    rect(d, (130, 33, 156, 38), WEAPON_METAL)
    # 弯弹匣（35发大容量）
    mag_curved(d, 52, 50, 14, 28, 8, WEAPON_DARK)
    grip(d, 42, 52, 20, 24, 12, WEAPON_GRIP)
    # 折叠托
    rect(d, (18, 38, 28, 45), WEAPON_DARK)
    text_label(d, "Galil AR")
    category_mark(d, 4, (220, 150, 80))
    save(img, "galil")

def draw_sg553():
    """SG 553: 长枪管 + 瞄准镜导轨"""
    img, d = new_canvas()
    rect(d, (20, 34, 142, 50), WEAPON_METAL)
    barrel(d, 140, 44, 28, 5, WEAPON_METAL)
    rect(d, (156, 40, 168, 48), WEAPON_DARK)
    # 集成瞄准镜
    rect(d, (80, 22, 110, 34), WEAPON_SCOPE)
    d.ellipse([106, 22, 114, 34], fill=(40, 60, 90))
    # 导轨
    rect(d, (45, 28, 80, 34), WEAPON_DARK)
    # 弹匣
    mag_curved(d, 52, 50, 14, 26, 8, WEAPON_DARK)
    grip(d, 42, 52, 20, 24, 14, WEAPON_GRIP)
    rect(d, (16, 36, 26, 52), WEAPON_GRIP)
    text_label(d, "SG 553")
    category_mark(d, 4, (220, 150, 80))
    save(img, "sg553")

def draw_aug():
    """AUG: 无托 + 集成瞄准镜"""
    img, d = new_canvas()
    rect(d, (18, 38, 148, 52), WEAPON_METAL)
    barrel(d, 146, 44, 22, 5, WEAPON_METAL)
    # 集成瞄准镜（AUG标志）
    rect(d, (45, 18, 75, 38), WEAPON_SCOPE)
    d.ellipse([72, 18, 78, 34], fill=(40, 60, 90))
    # 瞄准镜底座
    rect(d, (48, 34, 72, 38), WEAPON_DARK)
    # 弹匣（后置，无托）
    mag_straight(d, 110, 50, 10, 24, WEAPON_DARK)
    grip(d, 95, 52, 18, 22, 14, WEAPON_GRIP)
    rect(d, (14, 40, 22, 56), WEAPON_GRIP)
    rect(d, (8, 42, 16, 58), WEAPON_DARK)
    text_label(d, "AUG")
    category_mark(d, 4, (220, 150, 80))
    save(img, "aug")

# ══════════════════════════════════════════════════════════════════════════
#  狙击枪类 (Sniper Rifles)
# ══════════════════════════════════════════════════════════════════════════

def draw_awp():
    """AWP: 长枪管 + 大瞄准镜 + 两脚架"""
    img, d = new_canvas()
    # 长机匣
    rect(d, (14, 34, 100, 50), WEAPON_METAL)
    # 超长枪管
    barrel(d, 98, 42, 60, 6, WEAPON_METAL)
    # 制退器
    rect(d, (155, 38, 172, 48), WEAPON_DARK)
    # 大瞄准镜
    scope(d, 50, 16, 30, 20, WEAPON_SCOPE)
    # 弹匣
    mag_straight(d, 72, 48, 10, 22, WEAPON_DARK)
    # 两脚架
    d.line([(88, 48), (84, 68)], fill=WEAPON_METAL, width=2)
    d.line([(96, 48), (100, 68)], fill=WEAPON_METAL, width=2)
    # 枪托
    rect(d, (10, 36, 20, 52), WEAPON_GRIP)
    # 贴腮垫
    rect(d, (14, 30, 26, 36), WEAPON_DARK)
    grip(d, 42, 50, 18, 22, 14, WEAPON_GRIP)
    text_label(d, "AWP")
    category_mark(d, 4, (200, 120, 60))
    save(img, "awp")

def draw_ssg08():
    """SSG 08: 轻量狙击 — 短镜 + 细枪管"""
    img, d = new_canvas()
    rect(d, (22, 36, 110, 50), WEAPON_METAL)
    barrel(d, 108, 43, 52, 5, WEAPON_METAL)
    rect(d, (158, 38, 170, 48), WEAPON_DARK)
    # 小型瞄准镜
    rect(d, (50, 22, 72, 36), WEAPON_SCOPE)
    d.ellipse([68, 22, 74, 36], fill=(40, 60, 90))
    # 脚架（轻型）
    d.line([(96, 46), (94, 62)], fill=WEAPON_METAL, width=1)
    d.line([(102, 46), (104, 62)], fill=WEAPON_METAL, width=1)
    mag_straight(d, 68, 48, 8, 20, WEAPON_DARK)
    grip(d, 42, 50, 16, 20, 14, WEAPON_GRIP)
    rect(d, (18, 38, 28, 50), WEAPON_GRIP)
    text_label(d, "SSG 08")
    category_mark(d, 4, (200, 120, 60))
    save(img, "ssg08")

def draw_scar20():
    """SCAR-20: 自动狙击 — 重枪管 + 大弹匣"""
    img, d = new_canvas()
    rect(d, (18, 34, 128, 52), WEAPON_METAL)
    barrel(d, 126, 44, 36, 6, WEAPON_METAL)
    rect(d, (158, 38, 174, 48), WEAPON_DARK)
    # 瞄准镜
    rect(d, (60, 18, 86, 34), WEAPON_SCOPE)
    d.ellipse([82, 18, 88, 34], fill=(40, 60, 90))
    # 大型弹匣
    mag_straight(d, 66, 50, 12, 28, WEAPON_DARK)
    grip(d, 44, 52, 20, 22, 14, WEAPON_GRIP)
    rect(d, (14, 36, 24, 52), WEAPON_GRIP)
    rect(d, (8, 38, 16, 54), WEAPON_DARK)
    text_label(d, "SCAR-20")
    category_mark(d, 4, (200, 120, 60))
    save(img, "scar20")

def draw_g3sg1():
    """G3SG1: T方自动狙击 — G3枪身"""
    img, d = new_canvas()
    rect(d, (18, 34, 128, 52), WEAPON_METAL)
    barrel(d, 126, 44, 36, 6, WEAPON_METAL)
    rect(d, (158, 38, 174, 48), WEAPON_DARK)
    # 瞄准镜（低矮）
    rect(d, (55, 24, 80, 34), WEAPON_SCOPE)
    d.ellipse([76, 24, 82, 34], fill=(40, 60, 90))
    # 弹匣
    mag_straight(d, 64, 50, 10, 26, WEAPON_DARK)
    grip(d, 42, 52, 20, 22, 14, WEAPON_GRIP)
    rect(d, (14, 36, 24, 52), WEAPON_GRIP)
    rect(d, (8, 38, 16, 54), WEAPON_DARK)
    text_label(d, "G3SG1")
    category_mark(d, 4, (200, 120, 60))
    save(img, "g3sg1")

# ══════════════════════════════════════════════════════════════════════════
#  霰弹枪类 (Shotguns)
# ══════════════════════════════════════════════════════════════════════════

def draw_nova():
    """Nova: 泵动霰弹枪"""
    img, d = new_canvas()
    rect(d, (22, 36, 100, 52), WEAPON_METAL)
    # 单管泵动
    barrel(d, 98, 44, 58, 8, WEAPON_METAL)
    # 泵动手柄
    rect(d, (104, 40, 128, 52), WEAPON_WOOD)
    # 弹仓管
    barrel(d, 98, 38, 55, 4, WEAPON_METAL)
    # 枪托
    rect(d, (18, 38, 28, 52), WEAPON_WOOD)
    rect(d, (10, 40, 20, 55), WEAPON_DARK)
    grip(d, 52, 50, 18, 20, 14, WEAPON_GRIP)
    text_label(d, "Nova")
    category_mark(d, 4, (180, 130, 80))
    save(img, "nova")

def draw_mag7():
    """MAG-7: CT方泵动霰弹"""
    img, d = new_canvas()
    rect(d, (20, 36, 105, 52), WEAPON_METAL)
    barrel(d, 103, 44, 52, 8, WEAPON_METAL)
    # 泵动手柄
    rect(d, (108, 40, 130, 52), WEAPON_DARK)
    # 弹仓
    barrel(d, 103, 38, 50, 4, WEAPON_METAL)
    grip(d, 48, 50, 18, 22, 12, WEAPON_GRIP)
    rect(d, (16, 38, 26, 52), WEAPON_GRIP)
    rect(d, (10, 40, 18, 54), WEAPON_DARK)
    text_label(d, "MAG-7")
    category_mark(d, 4, (180, 130, 80))
    save(img, "mag7")

def draw_xm1014():
    """XM1014: 半自动霰弹枪"""
    img, d = new_canvas()
    rect(d, (18, 36, 120, 52), WEAPON_METAL)
    barrel(d, 118, 44, 40, 7, WEAPON_METAL)
    # 弹仓管
    barrel(d, 118, 38, 42, 4, WEAPON_METAL)
    # 护木
    rect(d, (92, 38, 118, 52), WEAPON_DARK)
    grip(d, 42, 50, 20, 22, 12, WEAPON_GRIP)
    # 伸缩托
    rect(d, (14, 38, 24, 52), WEAPON_DARK)
    rect(d, (8, 40, 16, 54), WEAPON_GRIP)
    text_label(d, "XM1014")
    category_mark(d, 4, (180, 130, 80))
    save(img, "xm1014")

def draw_sawedoff():
    """Sawed-Off: 短管双管霰弹"""
    img, d = new_canvas()
    # 截短机匣
    rect(d, (40, 36, 90, 52), WEAPON_METAL)
    # 双短管
    barrel(d, 88, 40, 25, 6, WEAPON_METAL)
    barrel(d, 88, 48, 25, 6, WEAPON_METAL)
    # 截断握把
    grip(d, 45, 50, 18, 18, 20, WEAPON_WOOD)
    # 短枪托
    rect(d, (38, 36, 46, 48), WEAPON_WOOD)
    text_label(d, "Sawed-Off")
    category_mark(d, 4, (180, 130, 80))
    save(img, "sawedoff")

# ══════════════════════════════════════════════════════════════════════════
#  机枪类 (Machine Guns)
# ══════════════════════════════════════════════════════════════════════════

def draw_m249():
    """M249: 弹链机枪 — 方形机匣 + 两脚架"""
    img, d = new_canvas()
    # 大型方形机匣
    rect(d, (18, 30, 120, 50), WEAPON_METAL)
    # 重型枪管
    barrel(d, 118, 42, 48, 8, WEAPON_METAL)
    # 火帽
    rect(d, (164, 36, 178, 48), WEAPON_DARK)
    # 弹链箱（方形）
    rect(d, (48, 24, 78, 32), WEAPON_DARK)
    # 弹链
    d.line([(52, 32), (50, 48)], fill=WEAPON_DARK, width=2)
    # 两脚架
    d.line([(108, 44), (104, 66)], fill=WEAPON_METAL, width=2)
    d.line([(116, 44), (120, 66)], fill=WEAPON_METAL, width=2)
    # 提把
    rect(d, (58, 20, 70, 32), WEAPON_DARK)
    grip(d, 38, 48, 22, 24, 12, WEAPON_GRIP)
    rect(d, (14, 36, 24, 52), WEAPON_DARK)
    text_label(d, "M249")
    category_mark(d, 4, (200, 100, 50))
    save(img, "m249")

def draw_negev():
    """Negev: 弹链机枪 — 长机匣 + 重型两脚架"""
    img, d = new_canvas()
    rect(d, (16, 32, 125, 52), WEAPON_METAL)
    barrel(d, 123, 44, 48, 7, WEAPON_METAL)
    rect(d, (168, 38, 180, 50), WEAPON_DARK)
    # 弹链箱（大型）
    rect(d, (50, 22, 82, 34), WEAPON_DARK)
    d.line([(56, 34), (54, 50)], fill=WEAPON_DARK, width=2)
    # 重型脚架
    d.line([(100, 46), (94, 68)], fill=WEAPON_METAL, width=3)
    d.line([(114, 46), (120, 68)], fill=WEAPON_METAL, width=3)
    # 提把
    rect(d, (60, 18, 74, 28), WEAPON_DARK)
    grip(d, 38, 50, 22, 24, 14, WEAPON_GRIP)
    rect(d, (12, 36, 22, 52), WEAPON_DARK)
    rect(d, (6, 38, 14, 54), WEAPON_GRIP)
    text_label(d, "Negev")
    category_mark(d, 4, (200, 100, 50))
    save(img, "negev")

# ══════════════════════════════════════════════════════════════════════════
#  近战/装备
# ══════════════════════════════════════════════════════════════════════════

def draw_knife():
    """战术刀: 弯刀刃 + 握把"""
    img, d = new_canvas()
    # 握把
    rect(d, (50, 52, 90, 66), WEAPON_GRIP)
    # 刃
    d.polygon([
        (75, 52), (90, 52), (110, 36), (135, 28),
        (155, 25), (155, 32), (130, 34), (105, 42),
        (85, 58), (75, 66)
    ], fill=WEAPON_METAL)
    # 护手
    rect(d, (70, 48, 92, 56), WEAPON_DARK)
    text_label(d, "Knife")
    category_mark(d, 4, (150, 150, 150))
    save(img, "knife")

def draw_zeus():
    """Zeus x27: 电击枪"""
    img, d = new_canvas()
    # 枪身（类似大号电击器）
    rect(d, (50, 36, 110, 50), WEAPON_DARK)
    # 电极（两根）
    rect(d, (108, 32, 118, 38), WEAPON_ACCENT)
    rect(d, (108, 48, 118, 54), WEAPON_ACCENT)
    # 电极尖端
    d.line([(118, 34), (124, 30)], fill=WEAPON_ACCENT, width=2)
    d.line([(118, 51), (124, 55)], fill=WEAPON_ACCENT, width=2)
    # 握把
    grip(d, 48, 52, 22, 22, 14, WEAPON_GRIP)
    # 高压标志
    d.text((64, 38), "⚡", fill=(255, 200, 30))
    text_label(d, "Zeus x27")
    category_mark(d, 4, (255, 200, 30))
    save(img, "zeus")

# ══════════════════════════════════════════════════════════════════════════
#  主入口
# ══════════════════════════════════════════════════════════════════════════

def main():
    print("🎯 生成 CSGO 武器 PNG 贴图...")
    print(f"   输出目录: {OUTPUT_DIR}")

    # 手枪
    print("\n  🔫 手枪 (10)")
    draw_glock()
    draw_usp_s()
    draw_p250()
    draw_five_seven()
    draw_deagle()
    draw_dual_berettas()
    draw_r8()
    draw_cz75()
    draw_tec9()
    draw_p2000()

    # SMG
    print("\n  🔫 微型冲锋枪 (7)")
    draw_mp9()
    draw_mac10()
    draw_pp_bizon()
    draw_mp7()
    draw_ump45()
    draw_p90()
    draw_mp5sd()

    # 步枪
    print("\n  🔫 步枪 (7)")
    draw_ak47()
    draw_m4a1s()
    draw_m4a4()
    draw_famas()
    draw_galil()
    draw_sg553()
    draw_aug()

    # 狙击枪
    print("\n  🔫 狙击枪 (4)")
    draw_awp()
    draw_ssg08()
    draw_scar20()
    draw_g3sg1()

    # 霰弹枪
    print("\n  🔫 霰弹枪 (4)")
    draw_nova()
    draw_mag7()
    draw_xm1014()
    draw_sawedoff()

    # 机枪
    print("\n  🔫 机枪 (2)")
    draw_m249()
    draw_negev()

    # 近战/装备
    print("\n  🔫 近战/装备 (2)")
    draw_knife()
    draw_zeus()

    print(f"\n✅ 共生成 36 张武器贴图 -> {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
