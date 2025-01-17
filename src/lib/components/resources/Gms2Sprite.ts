import {
  YySprite,
  SpriteType,
  yyDataDefaults,
  yyDataLayerDefaults,
  SpriteBoundingBoxMode,
  yyDataSequenceDefaults,
  yyDataSequenceTrackDefaults,
} from 'types/YySprite';
import { Gms2Storage } from '@/Gms2Storage';
import paths from '@/paths';
import {
  Gms2ResourceBase,
  Gms2ResourceBaseParameters,
} from './Gms2ResourceBase';
import { Spritely } from '@bscotch/spritely';
import { uuidV4 } from '@/uuid';
import { NumberFixed } from '@/NumberFixed';
import { assert, assertIsNumber } from '@/errors';
import { debug } from '@/log';
import pick from 'lodash/pick';

const toSingleDecimalNumber = (number: number | undefined) => {
  return new NumberFixed(number || 0, 1);
};

export class Gms2Sprite extends Gms2ResourceBase {
  protected yyData!: YySprite; // Happens in the super() constructor

  constructor(...setup: Gms2ResourceBaseParameters) {
    super('sprites', ...setup);
  }

  protected get fieldConverters() {
    return {
      'sequence.volume': toSingleDecimalNumber,
      'sequence.playbackSpeed': toSingleDecimalNumber,
      'sequence.length': toSingleDecimalNumber,
      'sequence.visibleRange.x': toSingleDecimalNumber,
      'sequence.visibleRange.y': toSingleDecimalNumber,
      'sequence.backdropXOffset': toSingleDecimalNumber,
      'sequence.backdropYOffset': toSingleDecimalNumber,
      'sequence.tracks.*.keyframes.Keyframes.*.Key': toSingleDecimalNumber,
      'sequence.tracks.*.keyframes.Keyframes.*.Length': toSingleDecimalNumber,
      'layers.*.opacity': toSingleDecimalNumber,
    };
  }

  get isSpine() {
    const frameId = this.frameIds[0];
    const atlasPath = paths.join(this.yyDirAbsolute, `${frameId}.atlas`);
    return this.storage.exists(atlasPath);
  }

  get textureGroup() {
    return this.yyData.textureGroupId.name;
  }
  set textureGroup(name: string) {
    this.yyData.textureGroupId.name = name;
    this.yyData.textureGroupId.path = `texturegroups/${name}`;
    this.save();
  }

  /** Get the array of current frameIds, in their frame order. */
  get frameIds() {
    return this.yyData.frames.map((frame) => frame.name);
  }

  set spriteType(type: SpriteType) {
    this.yyData.type = type;
  }

  protected createYyFile() {
    // Create a frameless sprite template
    const firstLayerId = uuidV4();

    const yyData: YySprite = {
      ...yyDataDefaults,
      height: 0, // Set later based on subimages!
      width: 0,
      bbox_bottom: 0, // Should set later based on frame dims
      bbox_right: 0, // Should set later based on frame dims
      frames: [], // Add frames later based on subimages!
      layers: [
        {
          ...yyDataLayerDefaults,
          name: firstLayerId,
        },
      ],
      name: this.name,
      parent: Gms2Sprite.parentDefault,
      sequence: {
        ...yyDataSequenceDefaults,
        length: new NumberFixed(0), // Update with number of frames
        name: this.name,
        parent: this.id,
        spriteId: this.id,
        tracks: [
          {
            ...yyDataSequenceTrackDefaults,
            keyframes: {
              Keyframes: [], // Update once there are frames to add
              resourceType: 'KeyframeStore<SpriteFrameKeyframe>',
              resourceVersion: '1.0',
            },
          },
        ],
        xorigin: 0, // Update with the origin of the sprite
        yorigin: 0, // Update with the origin of the sprite
      },
      textureGroupId: Gms2Sprite.textureGroupIdDefault,
      tags: [],
    };
    this.storage.writeJson(this.yyPathAbsolute, yyData);
  }

  /**
   * Set all yyData fields corresponding to height and width.
   * Must match the actual dims of the corresponding frames.
   * Adjust origin if the size has changed.
   */
  protected setDims(width: number, height: number) {
    for (const dim of ['width', 'height'] as const) {
      const value = { width, height }[dim];
      assertIsNumber(value, `${dim} is not a number: ${value}`);
      assert(value > 0, `${dim} must be > 0: ${value}`);
    }

    // Get the old height/width and origin for reference
    const oldOriginX = this.yyData.sequence.xorigin;
    const oldOriginY = this.yyData.sequence.yorigin;
    const oldHeight = this.yyData.height;
    const oldWidth = this.yyData.width;
    // If this is new, then the bbox right/bottom will be at zero

    const oldBbox = pick(this.yyData, [
      'bbox_bottom',
      'bbox_right',
      'bbox_top',
      'bbox_left',
    ] as const);

    this.yyData.height = height;
    this.yyData.width = width;
    this.yyData.bbox_bottom ||= height;
    this.yyData.bbox_right ||= width;

    const _scaleCoord = (oldPos: number, oldMax: number, newMax: number) => {
      if ([oldPos, oldMax, newMax].some((val) => val == 0)) {
        return 0;
      }
      return Math.floor((oldPos / oldMax) * newMax);
    };

    const isNew = oldHeight == 0 || oldWidth == 0;
    const dimsHaveChanged =
      !isNew && (width != oldWidth || height != oldHeight);
    if (isNew) {
      this.yyData.sequence.xorigin = Math.floor(width / 2);
      this.yyData.sequence.yorigin = Math.floor(height / 2);
    } else if (dimsHaveChanged) {
      this.yyData.sequence.xorigin = _scaleCoord(oldOriginX, oldWidth, width);
      this.yyData.sequence.yorigin = _scaleCoord(oldOriginY, oldHeight, height);
    }
    if (
      dimsHaveChanged &&
      this.yyData.bboxMode == SpriteBoundingBoxMode.FullImage
    ) {
      // Adjust to dims
      this.yyData.bbox_left = 0;
      this.yyData.bbox_top = 0;
      this.yyData.bbox_right = width;
      this.yyData.bbox_bottom = height;
    } else if (dimsHaveChanged) {
      // Adjust *relatively*
      const bboxScaleInfo = [
        {
          oldMax: oldWidth,
          max: width,
          fields: ['bbox_right', 'bbox_left'] as const,
        },
        {
          oldMax: oldHeight,
          max: height,
          fields: ['bbox_top', 'bbox_bottom'] as const,
        },
      ];
      for (const bbox of bboxScaleInfo) {
        for (const field of bbox.fields) {
          this.yyData[field] = _scaleCoord(
            oldBbox[field],
            bbox.oldMax,
            bbox.max,
          );
        }
      }
    }
    return this;
  }

  /** Force a layerId. Only updates the YY file, and only if there is only 1 layer. */
  setLayerId(layerId: string) {
    assert(
      this.yyData.layers.length === 1,
      'Cannot force the layerId if only one layer present.',
    );
    this.yyData.layers[0].name = layerId;
    return this;
  }

  addFrame(imagePath: string, frameGuid?: string, keyframeId?: string) {
    frameGuid ||= uuidV4();
    keyframeId ||= uuidV4();
    const keyFrames = this.yyData.sequence.tracks[0].keyframes.Keyframes;
    this.yyData.sequence.length = new NumberFixed(0);
    const framePath = paths.join(this.yyDirAbsolute, `${frameGuid}.png`);
    const frameLayerFolder = paths.join(
      this.yyDirAbsolute,
      'layers',
      frameGuid,
    );
    const layerId = this.yyData.layers[0].name;
    const frameLayerImagePath = paths.join(frameLayerFolder, `${layerId}.png`);
    this.storage.ensureDir(frameLayerFolder);
    this.storage.copyFile(imagePath, framePath);
    this.storage.copyFile(imagePath, frameLayerImagePath);
    this.yyData.frames.push({
      compositeImage: {
        FrameId: {
          name: frameGuid,
          path: this.id.path,
        },
        LayerId: null,
        resourceVersion: '1.0',
        name: '',
        tags: [],
        resourceType: 'GMSpriteBitmap',
      },
      images: [
        {
          FrameId: {
            name: frameGuid,
            path: this.id.path,
          },
          LayerId: {
            name: layerId,
            path: this.id.path,
          },
          resourceVersion: '1.0',
          name: '',
          tags: [],
          resourceType: 'GMSpriteBitmap',
        },
      ],
      parent: this.id,
      resourceVersion: '1.0',
      name: frameGuid,
      tags: [],
      resourceType: 'GMSpriteFrame',
    });
    keyFrames.push({
      id: keyframeId,
      Key: new NumberFixed(this.yyData.frames.length - 1),
      Length: new NumberFixed(1),
      Stretch: false,
      Disabled: false,
      IsCreationKey: false,
      Channels: {
        '0': {
          Id: {
            name: frameGuid,
            path: this.id.path,
          },
          resourceVersion: '1.0',
          resourceType: 'SpriteFrameKeyframe',
        },
      },
      resourceVersion: '1.0',
      resourceType: 'Keyframe<SpriteFrameKeyframe>',
    });
    this.yyData.sequence.length = new NumberFixed(this.yyData.frames.length);
    return this;
  }

  clearFrames() {
    debug(`clearing frames for sprite ${this.name}`);
    this.yyData.frames = [];
    this.yyData.sequence.tracks[0].keyframes.Keyframes = [];
    return this;
  }

  /**
   * Force the frames of this sprite to match the images
   * within a folder (non-recursive)
   */
  replaceFrames(spriteDirectory: string) {
    debug(`replacing frames from source ${spriteDirectory}`);
    const sprite = new Spritely(spriteDirectory);
    // Ensure that the sizes match
    this.setDims(sprite.width as number, sprite.height as number);
    // Replace all the frames

    // Replace all frames, but keep the existing IDs and ID
    // order where possible. (Minimizes useless git history changes.)
    const layersRoot = paths.join(this.yyDirAbsolute, 'layers');
    this.storage.ensureDir(layersRoot);
    this.storage.emptyDir(layersRoot);
    const oldFrameIds = this.frameIds;
    const track = this.yyData.sequence.tracks[0];
    const oldKeyframeIds = track.keyframes.Keyframes.map((frame) => frame.id);
    debug(`old frameIds: ${oldFrameIds.join(', ')}`);
    this.clearFrames();
    // Add each new frame, updating the yyData as we go.
    for (const [i, subimagePath] of sprite.paths.entries()) {
      const frameId = oldFrameIds[i];
      const keyframeId = oldKeyframeIds[i];
      debug(
        `adding frame ${i} using id ${frameId} from image at ${subimagePath}`,
      );
      this.addFrame(subimagePath, frameId, keyframeId);
    }
    this.deleteExtraneousFrames();

    return this.save();
  }

  /** Delete frames that are not in the sprite. */
  private deleteExtraneousFrames() {
    // Clear any frames that are not in the sprite
    const oldFrames = this.storage.listFiles(this.yyDirAbsolute, false, [
      'png',
    ]);
    for (const frame of oldFrames) {
      // Since frameIds are GUIDs, we can just check for it as
      // a substring without worrying about exactly where it appears
      // in the path.
      if (this.frameIds.some((frameId) => frame.includes(frameId))) {
        continue;
      }
      this.storage.deleteFile(frame);
      debug(`deleted old frame ${frame}`);
    }
    return this;
  }

  static get textureGroupIdDefault() {
    return {
      name: 'Default',
      path: 'texturegroups/Default',
    };
  }

  /**
   * Create a new sprite
   * @param subimageDirectory Absolute path to a directory containing the
   *                          subimages for this sprite. Will non-recursively
   *                          search for png images within that directory
   *                          and sort them alphabetically.
   */
  static create(
    subimageDirectory: string,
    storage: Gms2Storage,
    spriteName?: string,
  ) {
    return new Gms2Sprite(
      spriteName || paths.subfolderName(subimageDirectory),
      storage,
      true,
    ).replaceFrames(subimageDirectory);
  }
}
