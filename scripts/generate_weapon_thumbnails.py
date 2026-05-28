#!/usr/bin/env python3
"""
CS:GO 武器 PNG 缩略图生成器
使用 Pillow 绘制 CS:GO 风格武器剪影，输出 128x64 PNG
"""

import os
from PIL import Image, ImageDraw, ImageFont

# 输出目录
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "../client/public/assets/icons/weapons-png")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 颜色方案 — CS:GO 经典金色
GOLD = (232, 201, 106, 255)
GOLD_DARK = (180, 140, 50, 255)
GOLD_LIGHT = (245, 220, 140, 255)
SHADOW = (80, 60, 20, 120)
DARK = (40, 35, 15, 200)

W, H = 128, 64  # 缩略图尺寸 2:1


def new_image():
    """创建透明背景画布"""
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def draw_silhouette(draw, points, fill=GOLD, outline=GOLD_DARK, width=2):
    """绘制多边形剪影"""
    draw.polygon(points, fill=fill, outline=outline, width=width)


def rect(draw, x, y, w, h, fill=GOLD, outline=None, radius=2):
    """圆角矩形"""
    draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill, outline=outline)


def weapon_glock():
    """Glock-18: 经典手枪剪影"""
    img = new_image()
    d = ImageDraw.Draw(img)
    # 枪管 + 套筒
    rect(d, 8, 26, 62, 10, fill=GOLD, radius=2)
    rect(d, 14, 22, 12, 4, fill=GOLD_DARK, radius=1)  # 前准星
    rect(d, 62, 24, 28, 14, fill=GOLD, radius=2)  # 机匣
    rect(d, 86, 38, 18, 22, fill=GOLD_DARK, radius=3)  # 握把
    rect(d, 98, 60, 14, 4, fill=GOLD_DARK, radius=1)  # 弹匣底座
    rect(d, 100, 44, 10, 16, fill=GOLD, radius=1)  # 弹匣
    # 扳机护圈
    d.arc([80, 36, 96, 52], 0, 180, fill=GOLD_DARK, width=2)
    # 后照门
    rect(d, 56, 20, 16, 6, fill=GOLD_DARK, radius=1)
    return img


def weapon_usp():
    """USP-S: CT消音手枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    # 消音器
    rect(d, 4, 24, 28, 8, fill=GOLD_LIGHT, radius=2)
    # 套筒
    rect(d, 28, 26, 50, 10, fill=GOLD, radius=2)
    rect(d, 38, 22, 10, 4, fill=GOLD_DARK, radius=1)  # 照门
    # 机匣
    rect(d, 72, 24, 24, 16, fill=GOLD, radius=2)
    # 握把
    rect(d, 88, 40, 16, 20, fill=GOLD_DARK, radius=3)
    rect(d, 98, 60, 12, 4, fill=GOLD_DARK, radius=1)
    # 弹匣
    rect(d, 96, 42, 8, 18, fill=GOLD, radius=1)
    # 扳机护圈
    d.arc([78, 36, 94, 54], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_p2000():
    """P2000: CT经典手枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 8, 28, 56, 9, fill=GOLD, radius=2)
    rect(d, 18, 24, 10, 4, fill=GOLD_DARK, radius=1)
    rect(d, 56, 26, 22, 14, fill=GOLD, radius=2)
    rect(d, 74, 40, 16, 20, fill=GOLD_DARK, radius=2)
    rect(d, 84, 60, 12, 4, fill=GOLD_DARK, radius=1)
    rect(d, 86, 44, 8, 16, fill=GOLD, radius=1)
    d.arc([70, 38, 88, 54], 0, 180, fill=GOLD_DARK, width=2)
    rect(d, 48, 22, 12, 5, fill=GOLD_DARK, radius=1)
    return img


def weapon_p250():
    """P250: 现代手枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 10, 28, 54, 8, fill=GOLD, radius=2)
    rect(d, 20, 24, 8, 4, fill=GOLD_DARK, radius=1)
    rect(d, 58, 26, 20, 13, fill=GOLD, radius=2)
    rect(d, 72, 40, 14, 20, fill=GOLD_DARK, radius=2)
    rect(d, 80, 60, 10, 4, fill=GOLD_DARK, radius=1)
    rect(d, 82, 44, 6, 16, fill=GOLD, radius=1)
    d.arc([70, 36, 84, 52], 0, 180, fill=GOLD_DARK, width=2)
    rect(d, 46, 23, 14, 5, fill=GOLD_DARK, radius=1)
    return img


def weapon_dual():
    """Dual Berettas: 双枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    # 上方枪
    rect(d, 6, 14, 48, 8, fill=GOLD, radius=2)
    rect(d, 48, 12, 20, 12, fill=GOLD, radius=2)
    rect(d, 62, 24, 14, 18, fill=GOLD_DARK, radius=2)
    rect(d, 70, 42, 10, 14, fill=GOLD, radius=1)
    d.arc([58, 22, 74, 38], 0, 180, fill=GOLD_DARK, width=2)
    # 下方枪
    rect(d, 16, 36, 48, 8, fill=GOLD, radius=2)
    rect(d, 58, 34, 20, 12, fill=GOLD, radius=2)
    rect(d, 72, 46, 14, 16, fill=GOLD_DARK, radius=2)
    d.arc([68, 44, 84, 58], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_cz75():
    """CZ75-Auto: 全自动手枪，偏长"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 4, 24, 66, 10, fill=GOLD, radius=2)
    rect(d, 10, 20, 14, 4, fill=GOLD_DARK, radius=1)
    rect(d, 64, 22, 24, 14, fill=GOLD, radius=2)
    rect(d, 82, 36, 16, 22, fill=GOLD_DARK, radius=3)
    rect(d, 92, 58, 12, 4, fill=GOLD_DARK, radius=1)
    rect(d, 92, 40, 6, 18, fill=GOLD, radius=1)
    # 前置弹匣
    rect(d, 106, 18, 14, 42, fill=GOLD, radius=1)
    d.arc([76, 34, 94, 52], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_tec9():
    """Tec-9: T方进攻手枪，弹匣前置"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 6, 26, 56, 8, fill=GOLD, radius=2)
    rect(d, 56, 24, 20, 12, fill=GOLD, radius=2)
    rect(d, 70, 40, 12, 18, fill=GOLD_DARK, radius=2)
    rect(d, 78, 58, 8, 4, fill=GOLD_DARK, radius=1)
    # 前置长弹匣
    rect(d, 100, 16, 18, 44, fill=GOLD, radius=2)
    d.arc([66, 34, 82, 50], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_five_seven():
    """Five-SeveN: 穿甲利器"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 8, 26, 58, 9, fill=GOLD, radius=2)
    rect(d, 16, 22, 10, 4, fill=GOLD_DARK, radius=1)
    rect(d, 58, 24, 22, 15, fill=GOLD, radius=2)
    rect(d, 74, 40, 14, 20, fill=GOLD_DARK, radius=2)
    rect(d, 82, 60, 10, 4, fill=GOLD_DARK, radius=1)
    rect(d, 84, 44, 6, 16, fill=GOLD, radius=1)
    d.arc([70, 36, 86, 52], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_r8():
    """R8 Revolver: 转轮手枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 4, 28, 50, 8, fill=GOLD, radius=2)
    rect(d, 20, 24, 6, 4, fill=GOLD_DARK, radius=1)
    # 转轮
    d.ellipse([44, 20, 58, 36], fill=GOLD, outline=GOLD_DARK, width=2)
    rect(d, 54, 26, 18, 14, fill=GOLD, radius=2)
    rect(d, 72, 40, 14, 20, fill=GOLD_DARK, radius=2)
    rect(d, 80, 60, 10, 4, fill=GOLD_DARK, radius=1)
    d.arc([66, 36, 82, 52], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_deagle():
    """Desert Eagle: 大型手枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 24, 66, 14, fill=GOLD, radius=3)
    rect(d, 6, 20, 16, 5, fill=GOLD_DARK, radius=1)
    rect(d, 62, 22, 30, 18, fill=GOLD, radius=3)
    rect(d, 86, 40, 20, 24, fill=GOLD_DARK, radius=3)
    rect(d, 98, 64, 14, 4, fill=GOLD_DARK, radius=1)
    rect(d, 100, 42, 8, 22, fill=GOLD, radius=1)
    d.arc([80, 36, 102, 56], 0, 180, fill=GOLD_DARK, width=2)
    rect(d, 54, 18, 14, 6, fill=GOLD_DARK, radius=1)
    return img


# ── SMG 系列 ──────────────────────────────
def weapon_mac10():
    """MAC-10: T方SMG"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 4, 24, 48, 10, fill=GOLD, radius=2)
    rect(d, 50, 22, 22, 14, fill=GOLD, radius=2)
    rect(d, 68, 36, 14, 20, fill=GOLD_DARK, radius=2)
    rect(d, 78, 56, 10, 4, fill=GOLD_DARK, radius=1)
    # 弹匣
    rect(d, 92, 26, 14, 34, fill=GOLD, radius=1)
    # 折叠枪托
    rect(d, 86, 20, 4, 10, fill=GOLD_DARK, radius=1)
    rect(d, 82, 20, 44, 3, fill=GOLD_DARK, radius=1)
    d.arc([64, 34, 80, 50], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_mp9():
    """MP9: CT方SMG"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 4, 24, 52, 9, fill=GOLD, radius=2)
    rect(d, 54, 22, 20, 13, fill=GOLD, radius=2)
    rect(d, 68, 36, 12, 18, fill=GOLD_DARK, radius=2)
    rect(d, 78, 54, 8, 4, fill=GOLD_DARK, radius=1)
    rect(d, 96, 18, 10, 42, fill=GOLD, radius=1)  # 前置弹匣
    d.arc([62, 34, 78, 50], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_ump45():
    """UMP-45: 高穿甲SMG，较厚"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 6, 26, 56, 10, fill=GOLD, radius=2)
    rect(d, 58, 24, 20, 16, fill=GOLD, radius=2)
    rect(d, 74, 40, 12, 18, fill=GOLD_DARK, radius=2)
    rect(d, 84, 58, 8, 4, fill=GOLD_DARK, radius=1)
    rect(d, 100, 20, 12, 40, fill=GOLD, radius=1)  # 直弹匣
    d.arc([70, 36, 84, 52], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_pp_bizon():
    """PP-Bizon: 超大螺旋弹匣"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 4, 24, 46, 10, fill=GOLD, radius=2)
    rect(d, 48, 22, 16, 14, fill=GOLD, radius=2)
    rect(d, 60, 36, 10, 16, fill=GOLD_DARK, radius=2)
    # 螺旋弹筒（超大）
    d.ellipse([82, 8, 122, 56], fill=GOLD, outline=GOLD_DARK, width=2)
    d.ellipse([92, 18, 112, 46], fill=GOLD_DARK, outline=None)
    d.arc([58, 34, 72, 50], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_mp7():
    """MP7: 精准全能SMG"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 6, 26, 48, 9, fill=GOLD, radius=2)
    rect(d, 52, 24, 18, 13, fill=GOLD, radius=2)
    rect(d, 66, 38, 10, 16, fill=GOLD_DARK, radius=2)
    rect(d, 76, 54, 8, 4, fill=GOLD_DARK, radius=1)
    rect(d, 94, 22, 10, 38, fill=GOLD, radius=1)  # 弹匣
    # 折叠握把
    rect(d, 90, 44, 18, 4, fill=GOLD_DARK, radius=1)
    d.arc([60, 34, 74, 50], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_p90():
    """P90: 50发弹匣PDW，独特外形"""
    img = new_image()
    d = ImageDraw.Draw(img)
    # 顶部弹匣（平行枪管上方）
    rect(d, 12, 4, 96, 12, fill=GOLD, radius=3)
    # 枪管
    rect(d, 6, 22, 58, 7, fill=GOLD, radius=2)
    # 机匣
    rect(d, 60, 18, 20, 14, fill=GOLD, radius=2)
    rect(d, 76, 32, 12, 16, fill=GOLD_DARK, radius=2)
    rect(d, 86, 48, 8, 4, fill=GOLD_DARK, radius=1)
    # 拇指孔握把
    rect(d, 80, 40, 8, 18, fill=GOLD, radius=1)
    d.arc([72, 30, 86, 44], 0, 180, fill=GOLD_DARK, width=2)
    return img


# ── 步枪系列 ──────────────────────────────
def weapon_galil():
    """Galil AR: T方经济步枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 22, 66, 10, fill=GOLD, radius=2)  # 枪管
    rect(d, 64, 20, 18, 14, fill=GOLD, radius=2)  # 机匣
    rect(d, 80, 34, 12, 18, fill=GOLD_DARK, radius=2)  # 握把
    rect(d, 90, 52, 8, 4, fill=GOLD_DARK, radius=1)
    # 弯曲弹匣
    rect(d, 96, 18, 10, 42, fill=GOLD, radius=1)
    # 枪托
    rect(d, 108, 22, 2, 14, fill=GOLD_DARK, radius=1)
    rect(d, 108, 36, 18, 4, fill=GOLD_DARK, radius=1)
    d.arc([76, 32, 90, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_famas():
    """FAMAS: CT经济步枪，提把明显"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 4, 24, 58, 8, fill=GOLD, radius=2)
    rect(d, 58, 22, 20, 12, fill=GOLD, radius=2)
    # FAMAS 标志性提把
    rect(d, 44, 8, 38, 6, fill=GOLD, radius=1)
    rect(d, 44, 6, 4, 16, fill=GOLD_DARK, radius=1)
    rect(d, 78, 8, 4, 16, fill=GOLD_DARK, radius=1)
    rect(d, 74, 34, 12, 18, fill=GOLD_DARK, radius=2)
    rect(d, 84, 52, 8, 4, fill=GOLD_DARK, radius=1)
    rect(d, 98, 16, 10, 42, fill=GOLD, radius=1)  # 弹匣
    d.arc([68, 30, 84, 46], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_ak47():
    """AK-47: 经典步枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 24, 64, 8, fill=GOLD, radius=2)  # 枪管+导气
    rect(d, 62, 22, 20, 12, fill=GOLD, radius=2)  # 机匣
    # 弯曲弹匣
    rect(d, 96, 16, 12, 44, fill=GOLD, radius=1)
    # 木制握把
    rect(d, 80, 36, 12, 20, fill=GOLD_DARK, radius=2)
    rect(d, 90, 56, 8, 4, fill=GOLD_DARK, radius=1)
    # 木制枪托
    rect(d, 110, 20, 4, 12, fill=GOLD_DARK, radius=1)
    rect(d, 112, 24, 14, 6, fill=GOLD_DARK, radius=1)
    d.arc([74, 32, 90, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_m4a1s():
    """M4A1-S: CT消音步枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    # 消音器
    rect(d, 2, 22, 18, 10, fill=GOLD_LIGHT, radius=2)
    # 枪管
    rect(d, 18, 24, 46, 8, fill=GOLD, radius=2)
    rect(d, 60, 22, 18, 12, fill=GOLD, radius=2)  # 机匣
    rect(d, 74, 34, 12, 18, fill=GOLD_DARK, radius=2)  # 握把
    rect(d, 84, 52, 8, 4, fill=GOLD_DARK, radius=1)
    rect(d, 98, 16, 8, 42, fill=GOLD, radius=1)  # 弹匣
    # CT枪托
    rect(d, 108, 20, 4, 12, fill=GOLD_DARK, radius=1)
    rect(d, 110, 24, 16, 5, fill=GOLD_DARK, radius=1)
    d.arc([70, 32, 84, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_m4a4():
    """M4A4: CT主步枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 24, 60, 8, fill=GOLD, radius=2)
    rect(d, 58, 22, 18, 14, fill=GOLD, radius=2)
    rect(d, 72, 36, 12, 18, fill=GOLD_DARK, radius=2)
    rect(d, 82, 54, 8, 4, fill=GOLD_DARK, radius=1)
    rect(d, 98, 16, 8, 42, fill=GOLD, radius=1)
    rect(d, 108, 20, 4, 12, fill=GOLD_DARK, radius=1)
    rect(d, 110, 26, 16, 5, fill=GOLD_DARK, radius=1)
    d.arc([68, 32, 82, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_sg553():
    """SG 553: T方精准步枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 24, 62, 8, fill=GOLD, radius=2)
    rect(d, 60, 22, 18, 14, fill=GOLD, radius=2)
    rect(d, 74, 36, 12, 18, fill=GOLD_DARK, radius=2)
    rect(d, 84, 54, 8, 4, fill=GOLD_DARK, radius=1)
    rect(d, 100, 14, 10, 44, fill=GOLD, radius=1)  # 弹匣
    # 集成瞄准镜
    rect(d, 46, 8, 16, 8, fill=GOLD_DARK, radius=1)
    d.arc([68, 32, 84, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_aug():
    """AUG: CT精准步枪，内置瞄镜"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 4, 24, 58, 8, fill=GOLD, radius=2)
    rect(d, 58, 22, 18, 14, fill=GOLD, radius=2)
    rect(d, 72, 36, 12, 18, fill=GOLD_DARK, radius=2)
    rect(d, 82, 54, 8, 4, fill=GOLD_DARK, radius=1)
    # 内置瞄准镜
    rect(d, 42, 8, 22, 10, fill=GOLD_DARK, radius=1)
    d.ellipse([48, 10, 54, 16], fill=GOLD_LIGHT, outline=None)
    rect(d, 98, 16, 8, 42, fill=GOLD, radius=1)
    d.arc([66, 32, 82, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


# ── 狙击枪系列 ────────────────────────────
def weapon_ssg08():
    """SSG 08: 轻狙"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 28, 70, 6, fill=GOLD, radius=2)  # 长枪管
    rect(d, 68, 26, 16, 10, fill=GOLD, radius=2)  # 机匣
    rect(d, 82, 38, 8, 14, fill=GOLD_DARK, radius=2)
    # 瞄准镜
    rect(d, 52, 14, 24, 8, fill=GOLD_DARK, radius=1)
    d.ellipse([56, 16, 62, 20], fill=GOLD_LIGHT, outline=None)
    rect(d, 92, 26, 6, 30, fill=GOLD, radius=1)  # 弹匣
    # 枪托
    rect(d, 98, 24, 4, 18, fill=GOLD_DARK, radius=1)
    rect(d, 102, 34, 20, 5, fill=GOLD_DARK, radius=1)
    d.arc([76, 34, 90, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_awp():
    """AWP: 重型狙击枪，标志性长枪管+大瞄镜"""
    img = new_image()
    d = ImageDraw.Draw(img)
    # 超长枪管
    rect(d, 2, 26, 72, 8, fill=GOLD, radius=2)
    rect(d, 6, 22, 10, 4, fill=GOLD_DARK, radius=1)  # 枪口制退器
    # 机匣
    rect(d, 70, 24, 18, 12, fill=GOLD, radius=2)
    # 大瞄准镜
    rect(d, 42, 10, 20, 10, fill=GOLD_DARK, radius=1)
    d.ellipse([46, 12, 54, 18], fill=GOLD_LIGHT, outline=None)
    # 镜座
    rect(d, 46, 20, 16, 4, fill=GOLD_DARK, radius=1)
    rect(d, 86, 36, 8, 16, fill=GOLD_DARK, radius=2)
    rect(d, 94, 52, 6, 4, fill=GOLD_DARK, radius=1)
    rect(d, 100, 22, 6, 34, fill=GOLD, radius=1)  # 弹匣
    # 枪托
    rect(d, 108, 22, 4, 14, fill=GOLD_DARK, radius=1)
    rect(d, 112, 26, 14, 6, fill=GOLD_DARK, radius=1)
    d.arc([82, 32, 94, 46], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_scar20():
    """SCAR-20: CT自动狙击枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 26, 66, 7, fill=GOLD, radius=2)
    rect(d, 64, 24, 18, 12, fill=GOLD, radius=2)
    rect(d, 80, 36, 8, 16, fill=GOLD_DARK, radius=2)
    rect(d, 88, 52, 6, 4, fill=GOLD_DARK, radius=1)
    # 瞄准镜
    rect(d, 40, 10, 22, 8, fill=GOLD_DARK, radius=1)
    d.ellipse([44, 12, 50, 16], fill=GOLD_LIGHT, outline=None)
    rect(d, 96, 20, 8, 38, fill=GOLD, radius=1)  # 弹匣
    # 枪托
    rect(d, 108, 22, 2, 14, fill=GOLD_DARK, radius=1)
    rect(d, 108, 30, 18, 4, fill=GOLD_DARK, radius=1)
    d.arc([76, 32, 90, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_g3sg1():
    """G3SG1: T方自动狙击枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 26, 64, 7, fill=GOLD, radius=2)
    rect(d, 62, 24, 16, 12, fill=GOLD, radius=2)
    rect(d, 76, 36, 8, 16, fill=GOLD_DARK, radius=2)
    rect(d, 84, 52, 6, 4, fill=GOLD_DARK, radius=1)
    rect(d, 40, 10, 20, 8, fill=GOLD_DARK, radius=1)
    rect(d, 98, 18, 8, 40, fill=GOLD, radius=1)
    # 枪托
    rect(d, 108, 22, 2, 14, fill=GOLD_DARK, radius=1)
    rect(d, 108, 30, 16, 4, fill=GOLD_DARK, radius=1)
    d.arc([72, 32, 86, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


# ── 霰弹枪系列 ────────────────────────────
def weapon_nova():
    """Nova: 泵动霰弹枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    # 双管并列
    rect(d, 4, 22, 60, 5, fill=GOLD, radius=1.5)
    rect(d, 4, 28, 60, 5, fill=GOLD, radius=1.5)
    rect(d, 60, 22, 14, 12, fill=GOLD, radius=2)
    rect(d, 72, 34, 10, 16, fill=GOLD_DARK, radius=2)
    rect(d, 82, 50, 6, 4, fill=GOLD_DARK, radius=1)
    # 木制泵柄
    rect(d, 32, 34, 28, 5, fill=GOLD_DARK, radius=1)
    # 木制枪托
    rect(d, 92, 22, 4, 16, fill=GOLD_DARK, radius=1)
    rect(d, 96, 28, 26, 6, fill=GOLD_DARK, radius=2)
    d.arc([68, 30, 82, 44], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_mag7():
    """MAG-7: CT紧凑霰弹枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 4, 24, 48, 10, fill=GOLD, radius=2)
    rect(d, 50, 22, 16, 14, fill=GOLD, radius=2)
    rect(d, 64, 36, 8, 14, fill=GOLD_DARK, radius=2)
    rect(d, 72, 50, 6, 4, fill=GOLD_DARK, radius=1)
    rect(d, 80, 24, 8, 32, fill=GOLD, radius=1)  # 弹匣
    d.arc([58, 32, 72, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_xm1014():
    """XM1014: 半自动霰弹枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 24, 54, 7, fill=GOLD, radius=2)
    rect(d, 52, 22, 16, 12, fill=GOLD, radius=2)
    rect(d, 66, 34, 10, 16, fill=GOLD_DARK, radius=2)
    rect(d, 76, 50, 6, 4, fill=GOLD_DARK, radius=1)
    # 管式弹仓（下方）
    rect(d, 10, 36, 44, 4, fill=GOLD_DARK, radius=1)
    rect(d, 86, 22, 6, 32, fill=GOLD, radius=1)  # 弹匣
    # 枪托
    rect(d, 98, 20, 4, 14, fill=GOLD_DARK, radius=1)
    rect(d, 102, 26, 20, 5, fill=GOLD_DARK, radius=1)
    d.arc([62, 30, 76, 46], 0, 180, fill=GOLD_DARK, width=2)
    return img


# ── 机枪系列 ──────────────────────────────
def weapon_negev():
    """Negev: 压制机枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 26, 56, 7, fill=GOLD, radius=2)
    rect(d, 56, 24, 16, 12, fill=GOLD, radius=2)
    rect(d, 70, 36, 10, 16, fill=GOLD_DARK, radius=2)
    rect(d, 80, 52, 6, 4, fill=GOLD_DARK, radius=1)
    # 弹链箱
    rect(d, 86, 28, 20, 32, fill=GOLD, radius=1)
    rect(d, 108, 28, 4, 6, fill=GOLD_DARK, radius=1)  # 弹链
    # 大枪托
    rect(d, 112, 20, 4, 16, fill=GOLD_DARK, radius=1)
    rect(d, 114, 28, 12, 6, fill=GOLD_DARK, radius=1)
    d.arc([66, 34, 80, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


def weapon_m249():
    """M249: 100发弹链机枪"""
    img = new_image()
    d = ImageDraw.Draw(img)
    rect(d, 2, 24, 58, 8, fill=GOLD, radius=2)
    rect(d, 58, 22, 16, 14, fill=GOLD, radius=2)
    rect(d, 72, 36, 10, 18, fill=GOLD_DARK, radius=2)
    rect(d, 82, 54, 6, 4, fill=GOLD_DARK, radius=1)
    # 弹链箱（大）
    rect(d, 88, 30, 18, 30, fill=GOLD, radius=1)
    # 两脚架
    rect(d, 24, 34, 2, 14, fill=GOLD_DARK, radius=0.5)
    rect(d, 30, 34, 2, 14, fill=GOLD_DARK, radius=0.5)
    # 枪托
    rect(d, 108, 20, 4, 16, fill=GOLD_DARK, radius=1)
    rect(d, 112, 26, 14, 6, fill=GOLD_DARK, radius=1)
    d.arc([68, 32, 82, 48], 0, 180, fill=GOLD_DARK, width=2)
    return img


# 武器名 -> 生成函数 映射
WEAPONS = {
    # 手枪
    "pistol": weapon_glock,
    "usp_s": weapon_usp,
    "p2000": weapon_p2000,
    "p250": weapon_p250,
    "dual_berettas": weapon_dual,
    "cz75": weapon_cz75,
    "tec9": weapon_tec9,
    "five_seven": weapon_five_seven,
    "r8": weapon_r8,
    "deagle": weapon_deagle,
    # SMG
    "mac10": weapon_mac10,
    "mp9": weapon_mp9,
    "ump45": weapon_ump45,
    "pp_bizon": weapon_pp_bizon,
    "mp7": weapon_mp7,
    "p90": weapon_p90,
    # 步枪
    "galil": weapon_galil,
    "famas": weapon_famas,
    "ak47": weapon_ak47,
    "m4a1s": weapon_m4a1s,
    "m4a4": weapon_m4a4,
    "sg553": weapon_sg553,
    "aug": weapon_aug,
    # 狙击枪
    "ssg08": weapon_ssg08,
    "awp": weapon_awp,
    "scar20": weapon_scar20,
    "g3sg1": weapon_g3sg1,
    # 霰弹枪/机枪
    "nova": weapon_nova,
    "mag7": weapon_mag7,
    "xm1014": weapon_xm1014,
    "negev": weapon_negev,
    "m249": weapon_m249,
}


def main():
    for weapon_id, generator in WEAPONS.items():
        img = generator()
        filepath = os.path.join(OUTPUT_DIR, f"{weapon_id}.png")
        img.save(filepath, "PNG")
        print(f"✓ {filepath}")
    print(f"\n共生成 {len(WEAPONS)} 个武器缩略图 -> {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
