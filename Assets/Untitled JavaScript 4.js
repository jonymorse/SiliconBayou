//@input Asset.RemoteReferenceAsset myRemoteReferenceAsset
/** @type {RemoteReferenceAsset} */
var myRemoteReferenceAsset = script.myRemoteReferenceAsset;

/**
 * download remote asset from its reference
 */
function downloadAsset() {
  myRemoteReferenceAsset.downloadAsset(onDownloaded, onFailed);
}
/**
 * on asset successfully downloaded
 * @param {Asset} asset
 */
function onDownloaded(asset) {
  print(
    asset.name + ' was successfully downloaded, type is ' + asset.getTypeName()
  );
  // do something with an asset, for example:
  // - instantiate ObjectPrefab
  // - use Texture in Material
  // - display Mesh using RenderMeshVisual Component
  // - play AudioTrackAsset with Audio Component
}
/** on remote asset download failed */
function onFailed() {
  print(myRemoteReferenceAsset.name + ' was not downloaded');
  // use fallback asset or notify user that something went wrong
}