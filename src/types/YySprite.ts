import { YyData } from "./Yy";

export enum SpriteCollisionKind {
  Precise,
  Rectangle,
  Ellipse,
  Diamond,
  PrecisePerFrame,
  RectangleWithRotation,
}

export enum SpriteBoundingBoxMode {
  Automatic,
  FullImage,
  Manual,
}

export enum SpriteOrigin {
  TopLeft,
  TopCenter,
  TopRight,
  MiddleLeft,
  MiddleCenter,
  MiddleRight,
  BottomLeft,
  BottomCenter,
  BottomRight,
  Custom
}

export enum SpritePlaybackSpeedType {
  FramesPerSecond,
  FramesPerGameFrame,
}

interface SpriteImage {
  FrameId:{
    name: string,
    /** Path to the sprite's .yy file */
    path:string
  },
  LayerId:{
    /**
     * Name of the layer. Corresponds to an image in each layer folder,
     * and should be found in once in *each frame*. Must be found in the
     * sprite's root "layers" list.
     */
    name:string,
    /** Path to the sprite's .yy file */
    path:string
  },
  resourceVersion:"1.0",
  name:"",
  /** An empty array (there seems to be no way to add tags to frames) */
  tags:[],
  resourceType:"GMSpriteBitmap"
}

interface SpriteCompositeImage extends Omit<SpriteImage,'LayerId'|'name'> {
  LayerId:null,
  name:"composite",
}

interface SpriteFrame {
  /** Image created by flattening layers. */
  compositeImage: SpriteCompositeImage,
  /** One image per layer. */
  images: SpriteImage[],
  /** The parent sprite, same as the sprite's ID from the YYP. */
  parent:{
    name:string,
    path:string
  },
  resourceVersion:"1.0",
  /**
   * Unique GUID. Matches the name of an image file (+'.png')
   * that sits alongside the .yy file. Also matches a corresponding
   * folder name inside the "layers" folder. The Composite image
   * and each one listed in 'images' all have the same value here
   * for their "FrameId.name" field.
   */
  name:string,
  tags:[],
  resourceType:"GMSpriteFrame"
}

enum SpriteLayerBlendMode {
  Normal,
  Add,
  Subtract,
  Multiply,
}

interface SpriteLayer {
  /** (Default true) */
  visible:boolean,
  /** (Default false) */
  isLocked:boolean,
  /** Default 0 */
  blendMode:SpriteLayerBlendMode,
  /** Range from 0-100 */
  opacity:number,
  /** ("default" for the base layer) */
  displayName:string,
  resourceVersion:"1.0",
  /** The unique GUID for this layer, used by Frames in their LayerId field. */
  name:string,
  /** Seems to be unused -- always an empty array. */
  tags:[],
  resourceType:"GMImageLayer"
}

interface SpriteSequenceTrackKeyframe {
  id:string,
  /** Appears to be the index position within the keyframes array */
  Key:number,
  /** Appears to always be 1 for sprites */
  Length:1,
  /** Default false */
  Stretch:boolean,
  /** Default false */
  Disabled:boolean,
  /** Default false */
  IsCreationKey:boolean,
  Channels:{
    [channel:string]:{
      Id:{
        /** Frame/subimage GUID */
        name: string,
        /** Sprite .yy file (e.g. sprites/sprites/thisSprite.yy) */
        path: string
      },
      resourceVersion:"1.0",
      resourceType:"SpriteFrameKeyframe"
    }
  },
  resourceVersion:"1.0",
  resourceType:"Keyframe<SpriteFrameKeyframe>"
}

interface SpriteSequenceTrack {
  name:"frames",
  spriteId:null,
  keyframes:{
    Keyframes: SpriteSequenceTrackKeyframe[],
    resourceVersion:"1.0",
    resourceType:"KeyframeStore<SpriteFrameKeyframe>"
  },
  trackColour:0,
  inheritsTrackColour:true,
  builtinName:0,
  traits:0,
  interpolation:1,
  tracks:[],
  events:[],
  modifiers:[],
  isCreationTrack:false,
  resourceVersion:"1.0",
  tags:[],
  resourceType:"GMSpriteFramesTrack"
}

interface SpriteSequence {
  /** Matches the YYP resource's 'id' value */
  spriteId: {
    name:string,
    path:string
  },
  /** (Default 1) What is this? */
  timeUnits: 1,
  /** (Default 1) What is this? */
  playback: 1,
  /** FPS (probably 30, 45, or 60), set via the editor */
  playbackSpeed: number,
  /** FPS type, set via the editor */
  playbackSpeedType: SpritePlaybackSpeedType,
  /** (Default true) What is this? */
  autoRecord: true,
  /** (Default true) What is this? */
  volume: 1.0,
  /** Number of frames */
  length: 2.0,
  events: {
    Keyframes:[],
    resourceVersion:"1.0",
    resourceType:"KeyframeStore<MessageEventKeyframe>"
  },
  moments: {
    Keyframes:[],
    resourceVersion:"1.0",
    resourceType:"KeyframeStore<MomentsEventKeyframe>"
  },
  tracks: SpriteSequenceTrack[],
  /** Appears to be constant for sprites */
  visibleRange: null,
  /** Appears to be constant for sprites */
  lockOrigin: false,
  /** Appears to be constant for sprites */
  showBackdrop: true,
  /** Appears to be constant for sprites */
  showBackdropImage: false,
  /** Appears to be constant for sprites */
  backdropImagePath: "",
  /** Appears to be constant for sprites */
  backdropImageOpacity: 0.5,
  /** Appears to be constant for sprites */
  backdropWidth: 1366,
  /** Appears to be constant for sprites */
  backdropHeight: 768,
  /** Appears to be constant for sprites */
  backdropXOffset: 0,
  /** Appears to be constant for sprites */
  backdropYOffset: 0,
  xorigin: 32,
  yorigin: 32,
  eventToFunction: {},
  eventStubScript: null,
  parent: {
    /** The sprite's name */
    name:string,
    /** The sprite's relative yy path */
    path:string
  },
  resourceVersion: "1.3",
  /** The sprite's name */
  name: string,
  tags: [],
  resourceType: "GMSequence",
}

/**
 * Data structure for Sprite .yy files.
 * **Note:** We aren't populating the full
 * type until we need to create Sprites.
 * Until then, we can just include fields
 * as needed for editing existing sprites.
 */
export interface YySprite extends YyData {
  bboxMode: SpriteBoundingBoxMode,
  collisionKind: SpriteCollisionKind,
  /** (What is this?) */
  type: 0,
  origin: SpriteOrigin,
  /** (Default true.) */
  preMultiplyAlpha: boolean,
  /** (Default true.) */
  edgeFiltering: boolean,
  /** 0-255. Only meaningful if collision type is "Precise". */
  collisionTolerance: number,
  /** (What is this?) */
  swfPrecision: 2.525,
  bbox_left: number,
  bbox_right: number,
  bbox_top: number,
  bbox_bottom: number,
  /** (Default false.) Horizontally tiled */
  HTile: boolean,
  /** (Default false.) Vertically tiled */
  VTile: boolean,
  /** (Default false.) Used for 3d (not sure how set...) */
  For3D: boolean,
  width: number,
  height: number,
  /** Matches the texture's id from the YYP file */
  textureGroupId: {
    /** the name of the Texture Group */
    name: string,
    /** seems to just be `texturegroups/${name}` */
    path: string,
  },
  /** (What is this?) */
  swatchColours: null,
  /** (What is this?) */
  gridX: 0,
  /** (What is this?) */
  gridY: 0,
  frames: SpriteFrame[],
  sequence: SpriteSequence,
  layers: SpriteLayer[],
  resourceType: "GMSprite"
}
