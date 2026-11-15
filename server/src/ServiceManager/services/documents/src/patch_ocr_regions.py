from pathlib import Path

import docling.models.base_ocr_model as base_ocr_model

path = Path(base_ocr_model.__file__)
source = path.read_text()

replacements = [
    (
        '''        2. Eliminate clusters that intersect exclusively with programmatic text PDF cells
           The following clusters therefore remain:
           - Clusters without any overlapping PDF cell.
           - Clusters with at least one overlapping non-text region (e.g. bitmap, shape).
''',
        '''        2. Keep the clusters that need OCR:
           - Clusters overlapping a bitmap (their text may be rasterised).
           - Clusters without any visible programmatic text (their text may be
             vector-outlined, or the region may be empty).
           Vector shapes alone never force OCR: rules, underlines and table borders
           routinely cross clusters of perfectly good programmatic text, and OCR-ing
           those is both slow and lossier than the text layer.
''',
    ),
    (
        '''            # Index for the non-text PDF cells: bitmaps, and shapes when available
            non_text_boxes = list(backend.get_bitmap_rects())
            shape_boxes = backend.get_connected_shape_bounding_boxes()
            if shape_boxes is not None:
                non_text_boxes.extend(shape_boxes)

            non_text_index = BoundingBoxSpatialIndex()
            for i, bbox in enumerate(non_text_boxes):
                non_text_index.insert(i, bbox)
''',
        '''            # Index only bitmaps. Vector-only regions are covered by the no-text check.
            non_text_index = BoundingBoxSpatialIndex()
            for i, bbox in enumerate(backend.get_bitmap_rects()):
                non_text_index.insert(i, bbox)
''',
    ),
    (
        '''            if use_backend_queries:
                has_non_text = backend.has_content_in(
                    bbox=cluster_bbox, chars=False, shapes=True, bitmaps=True
                )
            else:
                assert non_text_index is not None
                has_non_text = any(
                    True for _ in non_text_index.intersection(cluster_bbox)
                )

            if has_non_text:
''',
        '''            if use_backend_queries:
                has_bitmap = backend.has_content_in(
                    bbox=cluster_bbox, chars=False, shapes=False, bitmaps=True
                )
            else:
                assert non_text_index is not None
                has_bitmap = any(
                    True for _ in non_text_index.intersection(cluster_bbox)
                )

            if has_bitmap:
''',
    ),
]

for original, patched in replacements:
    if source.count(original) != 1:
        raise RuntimeError(
            "Docling OCR selection code changed; review the OCR regions patch."
        )
    source = source.replace(original, patched, 1)

path.write_text(source)
