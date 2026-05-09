#!/usr/bin/env python3
"""
SVG → PPTX Bridge Script
Called by Node.js PythonBridgeService via subprocess.

Imports ppt-master's svg_to_pptx converter and performs the conversion.
Outputs JSON result to stdout for the Node.js caller to parse.
"""

import sys
import json
import argparse
import os
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description='Bridge script for SVG→PPTX conversion (called by Node.js server)'
    )
    parser.add_argument('--mode', choices=['single', 'batch'], required=True,
                        help='Conversion mode: single SVG or batch of SVGs')
    parser.add_argument('--input', help='Input SVG file path (single mode)')
    parser.add_argument('--manifest', help='JSON manifest file path (batch mode)')
    parser.add_argument('--output', required=True, help='Output PPTX file path')
    parser.add_argument('--conversion-mode', choices=['native', 'legacy'], default='native',
                        help='Conversion mode: native DrawingML or legacy SVG-as-image')
    args = parser.parse_args()

    try:
        # Import ppt-master converter
        # PYTHONPATH is set by the Node.js caller to include ppt-master's scripts directory
        from svg_to_pptx.pptx_builder import PptxBuilder
        from svg_to_pptx.pptx_dimensions import get_canvas_format
        from svg_to_pptx.drawingml_converter import convert_svg_file

        if args.mode == 'single':
            # Single SVG → PPTX
            if not args.input:
                print(json.dumps({"success": False, "error": "--input required for single mode"}))
                sys.exit(1)

            svg_path = Path(args.input)
            if not svg_path.exists():
                print(json.dumps({"success": False, "error": f"SVG file not found: {args.input}"}))
                sys.exit(1)

            # Create a single-slide PPTX
            builder = PptxBuilder()
            canvas_format = get_canvas_format('ppt169')  # Default 16:9

            # Convert SVG to DrawingML and add as slide
            slide_xml, media_files = convert_svg_file(
                str(svg_path),
                canvas_format=canvas_format,
                mode=args.conversion_mode
            )

            builder.add_slide(slide_xml, media_files, notes=None)

            # Write PPTX
            output_path = Path(args.output)
            builder.save(str(output_path))

            print(json.dumps({"success": True, "output": str(output_path)}))

        elif args.mode == 'batch':
            # Batch SVGs → single PPTX
            if not args.manifest:
                print(json.dumps({"success": False, "error": "--manifest required for batch mode"}))
                sys.exit(1)

            with open(args.manifest, 'r', encoding='utf-8') as f:
                manifest = json.load(f)

            slides = manifest.get('slides', [])
            mode = manifest.get('mode', args.conversion_mode)

            builder = PptxBuilder()

            errors = []
            for slide_info in slides:
                svg_path = slide_info.get('svg_path', '')
                title = slide_info.get('title', f'Slide {slide_info.get("index", 0) + 1}')

                svg_file = Path(svg_path)
                if not svg_file.exists():
                    errors.append(f"SVG not found: {svg_path}")
                    continue

                try:
                    canvas_format = get_canvas_format('ppt169')

                    slide_xml, media_files = convert_svg_file(
                        str(svg_file),
                        canvas_format=canvas_format,
                        mode=mode
                    )

                    builder.add_slide(slide_xml, media_files, notes=title)
                except Exception as e:
                    errors.append(f"Error converting slide {slide_info.get('index')}: {str(e)}")

            # Write PPTX even if some slides failed
            output_path = Path(args.output)
            builder.save(str(output_path))

            result = {
                "success": len(errors) < len(slides),  # Success if at least one slide converted
                "output": str(output_path),
                "errors": errors,
                "total_slides": len(slides),
                "converted_slides": len(slides) - len(errors)
            }
            print(json.dumps(result))

    except ImportError as e:
        print(json.dumps({
            "success": False,
            "error": f"Failed to import ppt-master converter: {str(e)}. "
                     f"Ensure PYTHONPATH includes ppt-master's scripts directory and "
                     f"python-pptx is installed."
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()