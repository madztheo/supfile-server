function toggleFileSharing(req, res, isPublic) {
    if (!req.master && !req.user) {
        res.error("User undefined");
        return;
    }
    var fileId = req.params.fileId;
    if (!fileId) {
        res.error("Undefined file id");
    }
    var query = new Parse.Query("File");
    query
        .get(fileId, { sessionToken: req.user.getSessionToken() })
        .then(function (file) {
        if (file) {
            console.log(file.isValid());
            var acl = file.getACL();
            acl.setPublicReadAccess(isPublic);
            file.setACL(acl);
            file
                .save(null, { sessionToken: req.user.getSessionToken() })
                .then(function (savedFile) {
                res.success(savedFile);
            })["catch"](function (err) { return res.error(err); });
        }
        else {
            res.error("Unable to find the file");
        }
    })["catch"](function (err) { return res.error(err); });
}
Parse.Cloud.define("shareFile", function (req, res) {
    toggleFileSharing(req, res, true);
});
Parse.Cloud.define("stopSharingFile", function (req, res) {
    toggleFileSharing(req, res, false);
});
function toggleFolderAndContentSharing(folder, isPublic, sessionToken) {
    if (folder) {
        var acl = folder.getACL();
        acl.setPublicReadAccess(isPublic);
        folder.setACL(acl);
        return Promise.resolve(folder.save(null, { sessionToken: sessionToken }).then(function () {
            var fileQuery = new Parse.Query("File");
            fileQuery.equalTo("folder", folder);
            return fileQuery.find({ sessionToken: sessionToken }).then(function (files) {
                return Promise.all(files.map(function (x) {
                    var fileAcl = x.getACL();
                    fileAcl.setPublicReadAccess(isPublic);
                    x.setACL(fileAcl);
                    return Promise.resolve(x.save(null, { sessionToken: sessionToken }));
                })).then(function () {
                    var subFoldersQuery = new Parse.Query("Folder");
                    subFoldersQuery.equalTo("parent", folder);
                    return subFoldersQuery
                        .find({ sessionToken: sessionToken })
                        .then(function (folders) {
                        return Promise.all(folders.map(function (fldr) {
                            return toggleFolderAndContentSharing(fldr, isPublic, sessionToken);
                        }));
                    });
                });
            });
        }));
    }
    else {
        return Promise.reject("File undefined");
    }
}
function toggleFolderSharing(req, res, isPublic) {
    if (!req.master && !req.user) {
        res.error("User undefined");
        return;
    }
    var folderId = req.params.folderId;
    if (!folderId) {
        res.error("Undefined folder id");
    }
    var query = new Parse.Query("Folder");
    query
        .get(folderId, { sessionToken: req.user.getSessionToken() })
        .then(function (folder) {
        return toggleFolderAndContentSharing(folder, isPublic, req.user.getSessionToken())
            .then(function () {
            res.success(folder);
        })["catch"](function (err) {
            res.error(err);
        });
    })["catch"](function () { return res.error("Error while retrieving the folder"); });
}
Parse.Cloud.define("shareFolder", function (req, res) {
    toggleFolderSharing(req, res, true);
});
Parse.Cloud.define("stopSharingFolder", function (req, res) {
    toggleFolderSharing(req, res, false);
});
//# sourceMappingURL=file-sharing.js.map