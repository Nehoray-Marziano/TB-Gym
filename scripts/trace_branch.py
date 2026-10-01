import vtracer

input_path = "C:/Users/U6071035/.gemini/antigravity/brain/672d7f39-fa4f-41ce-bdf0-e103627cedbc/.user_uploaded/media_1790841462951.png"
output_path = "C:/Users/U6071035/OneDrive - Clarivate Analytics/Desktop/Talia/TB-Gym/public/user_branch.svg"

vtracer.convert_image_to_svg_py(
    input_path,
    output_path,
    colormode="binary",
    hierarchical="stacked",
    mode="spline",
    filter_speckle=4,
    color_precision=8,
    layer_difference=16,
    corner_threshold=60,
    length_threshold=4.0,
    max_iterations=10,
    splice_threshold=45,
    path_precision=3
)
print("Successfully generated SVG")
