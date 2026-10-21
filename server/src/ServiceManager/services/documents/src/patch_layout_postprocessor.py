from pathlib import Path

import docling.utils.layout_postprocessor as layout_postprocessor

path = Path(layout_postprocessor.__file__)
source = path.read_text()
# Match the whole method so upstream changes to its logic require review.
original = '''    def _adjust_cluster_bboxes(self, clusters: list[Cluster]) -> list[Cluster]:
        """Adjust cluster bounding boxes to contain their cells."""
        for cluster in clusters:
            if not cluster.cells:
                continue

            cells_bbox = BoundingBox(
                l=min(cell.rect.to_bounding_box().l for cell in cluster.cells),
                t=min(cell.rect.to_bounding_box().t for cell in cluster.cells),
                r=max(cell.rect.to_bounding_box().r for cell in cluster.cells),
                b=max(cell.rect.to_bounding_box().b for cell in cluster.cells),
            )

            if cluster.label == DocItemLabel.TABLE:
                # For tables, take union of current bbox and cells bbox
                cluster.bbox = BoundingBox(
                    l=min(cluster.bbox.l, cells_bbox.l),
                    t=min(cluster.bbox.t, cells_bbox.t),
                    r=max(cluster.bbox.r, cells_bbox.r),
                    b=max(cluster.bbox.b, cells_bbox.b),
                )
            else:
                cluster.bbox = cells_bbox

        return clusters
'''
patched = original.replace(
    "            else:\n",
    "            elif cluster.label != DocItemLabel.LIST_ITEM:\n",
    1,
)

# Preserve list-item bounds, including markers outside the extracted text cells.
if source.count(original) != 1:
    raise RuntimeError("Docling layout code changed; review the list-item patch.")

path.write_text(source.replace(original, patched, 1))
