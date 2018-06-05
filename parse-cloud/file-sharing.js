/**
 * Toggle sharing on a file by making it public accessible or private
 * @param req The request object received
 * @param res The response object to be sent
 * @param isPublic If true, make the file publicly accessible. If false, make the file private
 */
function toggleFileSharing(req, res, isPublic) {
    if (!req.user) {
        //We cannot continue if the user is not defined
        res.error("User undefined");
        return;
    }
    var fileId = req.params.fileId;
    if (!fileId) {
        res.error("Undefined file id");
        return;
    }
    //We get the file with the id given in parameters
    var query = new Parse.Query("File");
    query
        .get(fileId, { sessionToken: req.user.getSessionToken() })
        .then(function (file) {
        if (file) {
            //If we did get the file, we get its ACL (defining its access rights).
            var acl = file.getACL();
            //We define its public read access according to what has been asked by the user
            acl.setPublicReadAccess(isPublic);
            //And we save the new acl of the file
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
/**
 * Make a file public
 */
Parse.Cloud.define("shareFile", function (req, res) {
    toggleFileSharing(req, res, true);
});
/**
 * Make a file private
 */
Parse.Cloud.define("stopSharingFile", function (req, res) {
    toggleFileSharing(req, res, false);
});
/**
 * Toggle sharing on a folder by making it public accessible or private along with
 * all its content (subfolders and files).
 * @param folder Folder to edit
 * @param isPublic If true, make the folder publicly accessible. If false, make the folder private
 * @param sessionToken Session token of the user to make the request on behalf of the user with its rights
 */
function toggleFolderAndContentSharing(folder, isPublic, sessionToken) {
    if (folder) {
        //We get the folder ACL
        var acl = folder.getACL();
        //We set its public read access
        acl.setPublicReadAccess(isPublic);
        folder.setACL(acl);
        //Just to get a standard Promise out of the custom Parse Promise
        return Promise.resolve(
        //We save the modifed folder
        folder.save(null, { sessionToken: sessionToken }).then(function () {
            //We get all the files contained directly in the folder
            var fileQuery = new Parse.Query("File");
            fileQuery.equalTo("folder", folder);
            return fileQuery.find({ sessionToken: sessionToken }).then(function (files) {
                return Promise.all(files.map(function (x) {
                    //We set the same ACL for the files contained in the folder
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
                        //We then change the ACLs for the subfolders of the folder
                        //by calling the function itself with the subfolders as argument
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
/**
 * Toggle sharing on a folder by making it public accessible or private along with
 * all its content (subfolders and files). To be called in a Parse function.
 * @param req The request object received
 * @param res The response object to be sent
 * @param isPublic If true, make the folder publicly accessible. If false, make the folder private
 */
function toggleFolderSharing(req, res, isPublic) {
    if (!req.user) {
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
/**
 * Make a folder public
 */
Parse.Cloud.define("shareFolder", function (req, res) {
    toggleFolderSharing(req, res, true);
});
/**
 * Make a folder private
 */
Parse.Cloud.define("stopSharingFolder", function (req, res) {
    toggleFolderSharing(req, res, false);
});
//# sourceMappingURL=file-sharing.js.map