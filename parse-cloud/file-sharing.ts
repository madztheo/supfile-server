function toggleFileSharing(req, res, isPublic) {
  if (!req.master && !req.user) {
    res.error("User undefined");
    return;
  }
  const fileId = req.params.fileId;
  if (!fileId) {
    res.error("Undefined file id");
  }
  let query = new Parse.Query("File");
  query
    .get(fileId, { sessionToken: req.user.getSessionToken() })
    .then(file => {
      if (file) {
        console.log(file.isValid());
        let acl = file.getACL();
        acl.setPublicReadAccess(isPublic);
        file.setACL(acl);
        file
          .save(null, { sessionToken: req.user.getSessionToken() })
          .then(savedFile => {
            res.success(savedFile);
          })
          .catch(err => res.error(err));
      } else {
        res.error("Unable to find the file");
      }
    })
    .catch(err => res.error(err));
}

Parse.Cloud.define("shareFile", (req, res) => {
  toggleFileSharing(req, res, true);
});

Parse.Cloud.define("stopSharingFile", (req, res) => {
  toggleFileSharing(req, res, false);
});

function toggleFolderAndContentSharing(
  folder: Parse.Object,
  isPublic: boolean,
  sessionToken: string
): Promise<any> {
  if (folder) {
    let acl = folder.getACL();
    acl.setPublicReadAccess(isPublic);
    folder.setACL(acl);
    return Promise.resolve(
      folder.save(null, { sessionToken: sessionToken }).then(() => {
        let fileQuery = new Parse.Query("File");
        fileQuery.equalTo("folder", folder);
        return fileQuery.find({ sessionToken: sessionToken }).then(files => {
          return Promise.all(
            files.map(x => {
              let fileAcl = x.getACL();
              fileAcl.setPublicReadAccess(isPublic);
              x.setACL(fileAcl);
              return Promise.resolve(
                x.save(null, { sessionToken: sessionToken })
              );
            })
          ).then(() => {
            let subFoldersQuery = new Parse.Query("Folder");
            subFoldersQuery.equalTo("parent", folder);
            return subFoldersQuery
              .find({ sessionToken: sessionToken })
              .then(folders => {
                return Promise.all(
                  folders.map(fldr => {
                    return toggleFolderAndContentSharing(
                      fldr,
                      isPublic,
                      sessionToken
                    );
                  })
                );
              });
          });
        });
      })
    );
  } else {
    return Promise.reject("File undefined");
  }
}

function toggleFolderSharing(req, res, isPublic) {
  if (!req.master && !req.user) {
    res.error("User undefined");
    return;
  }
  const folderId = req.params.folderId;
  if (!folderId) {
    res.error("Undefined folder id");
  }
  let query = new Parse.Query("Folder");
  query
    .get(folderId, { sessionToken: req.user.getSessionToken() })
    .then(folder => {
      return toggleFolderAndContentSharing(
        folder,
        isPublic,
        req.user.getSessionToken()
      )
        .then(() => {
          res.success(folder);
        })
        .catch(err => {
          res.error(err);
        });
    })
    .catch(() => res.error("Error while retrieving the folder"));
}

Parse.Cloud.define("shareFolder", (req, res) => {
  toggleFolderSharing(req, res, true);
});

Parse.Cloud.define("stopSharingFolder", (req, res) => {
  toggleFolderSharing(req, res, false);
});
