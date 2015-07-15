var _ = require("underscore")
var oboe = require("oboe")
var React = require("react");
var mui = require("material-ui");
var injectTapEventPlugin = require("react-tap-event-plugin");

injectTapEventPlugin();

var MAX_MOUNT_POINTS = 3;

var VALID_VOLUME_NAME_REGEXP = /^[a-zA-Z0-9_\-]+$/;
var MAX_VOLUME_NAME_LENGTH = 20;

var VALID_PASSWORD_REGEXP = /^[a-zA-Z0-9_\-]+$/;
var MAX_PASSWORD_LENGTH = 20;   


var STATUS_OK = 1000;
var STATUS_EMPTY = 1001;
var STATUS_TOO_LONG = 1002;
var STATUS_CONTAINS_INVALID_CHARS = 1003;
var STATUS_STARTS_WITH_UNDERSCORE = 1004;


var GET_VOLUMES_URL = "/crypto/GetVolumes.php";
var DELETE_URL = "/crypto/Delete.php";
var CREATE_URL = "/crypto/Create.php";
var UNMOUNT_URL = "/crypto/Unmount.php";
var MOUNT_URL = "/crypto/Mount.php";


function GetStatus(str, maxLength, regexp) {
    if (str === "") {
        return STATUS_EMPTY;
    }
    else if (str.length > maxLength) {
        return STATUS_TOO_LONG;
    }
    else if (!regexp.test(str)) {
        return STATUS_CONTAINS_INVALID_CHARS;
    }
    else {
        return STATUS_OK;
    }
}


function GetPasswordStatus(password) {
    return GetStatus(password, MAX_PASSWORD_LENGTH, VALID_PASSWORD_REGEXP);
}

function GetVolumeNameStatus(volumeName) {
    var status = GetStatus(volumeName, MAX_VOLUME_NAME_LENGTH, VALID_VOLUME_NAME_REGEXP);
    if (status === STATUS_OK && volumeName[0] === "_") {
        return STATUS_STARTS_WITH_UNDERSCORE;
    }
    else {
        return status;
    }
}


function GetErrorMessage(status, emptyIsAnError) {
   switch (status) {
        case STATUS_TOO_LONG:
            return "Too long";
        case STATUS_CONTAINS_INVALID_CHARS:
            return "Invalid character(s)";
        case STATUS_EMPTY:
            return emptyIsAnError ? "Required" : null;
        case STATUS_STARTS_WITH_UNDERSCORE:
            return "Starts with underscore";
        case STATUS_OK:
            return null;
        default:
            console.assert(false);
    }
}



// Don't create, delete or do anything else with these directory names.
RESERVED_VOLUME_NAMES = _.map([
        "wdmc",         // These are created by MyPassport in various directories automatically
        "wdcache",      // Already exists in the root of the MyPassport hard drive.
        "DS_Store",     // Created by Finder in OS X
        "AppleDouble",  // Don't know if it's created by Finder, Netatalk or something else. But it exists.
        
        // The ones below are taken from TwonkyMediaServer settings on the WD MyPassport Wireless.
        "AppleDB",
        "AppleDesktop",
        "TemporaryItems",
        "fseventsd",
        "Spotlight-V100",
        "Trashes",
        "Trash",
        "RECYCLED",
        "RECYCLER",
        "Software",
        "wdphotos",
        "twonkymedia",
        "wd-alert"
    ],
    function(s) {
        return s.toLowerCase();
    });

function IsReservedVolumeName(volumeName) {
    var volumeNameLowerCase = volumeName.toLowerCase();
    var isReserved = _.contains(RESERVED_VOLUME_NAMES, volumeNameLowerCase);
    return isReserved;
}


var MountComponent = React.createClass({

    getInitialState: function() {
        var initialSelectedVolume = this.props.initialSelectedVolume;
        var menuItems = this.getMenuItems();
        var selectedIndex = _.findIndex(menuItems, function(item) {
                return item.text == initialSelectedVolume;
            })
          
        return {password: "",
                showButtonPressErrors: false,
                selectedIndex: Math.max(0, selectedIndex)};
    },
    
    onVolumeChange: function(e, selectedIndex, menuItem) {
        this.setState({password: "",
                       showButtonPressErrors: false,
                       selectedIndex: selectedIndex});
    },
    
    onPasswordChange: function(e) {
        this.setState({password: e.target.value,
                       showButtonPressErrors: false});
    },
    
    trySubmit: function() {
        if (this.props.showingModal) {
            return;
        }

        var passwordStatus = GetPasswordStatus(this.refs.password.getValue() || "");
        var volumeName = this.refs.menu.props.menuItems[this.refs.menu.state.selectedIndex].payload;
        
        if (passwordStatus === STATUS_OK) {
            this.props.onMountClicked(
                    volumeName,
                    this.refs.password.getValue());
            this.refs.password.getDOMNode().blur();
            this.refs.mountbutton.getDOMNode().blur();
        }
        else {
            this.setState({showButtonPressErrors: true});
        }
    },
    
    onMountClicked: function() {
        this.trySubmit();
    },
    
    onKeyPress: function(e) {
        if (e.charCode == 13) {
            // Submit when pressing return
            this.trySubmit();
        }
    },
    
    getMenuItems: function() {
        var menuItems = [];
        
        _.each(this.props.volumes, function(item, index) {
            if (item.numMountPoints < MAX_MOUNT_POINTS && !IsReservedVolumeName(item.name)) {
                menuItems.push({payload: item.name, text: item.name});
            }
        });

        return menuItems;
    },
    
    render: function() {
        var menuItems = this.getMenuItems()

        if (this.props.volumes.length === 0) {
            return (
                <div className="tab-content">
                    No encfs volumes found.
                </div>);
        }
        else if (menuItems.length === 0) {
            return (
                <div className="tab-content">
                    All encfs volumes already mounted.
                </div>);
        }
        else {
            var passwordStatus = GetPasswordStatus(this.state.password);
            var passwordErrorMessage = GetErrorMessage(passwordStatus, this.state.showButtonPressErrors);
            
            return (
                <div className="tab-content">
                    <mui.DropDownMenu
                            ref="menu"
                            menuItems={menuItems}
                            onChange={this.onVolumeChange}
                            autoWidth={false}
                            tabIndex="-1"
                            selectedIndex={this.state.selectedIndex}
                        />
                    <mui.TextField
                            ref="password"
                            type={this.props.showPassword ? "text" : "password"}
                            name="password"
                            value={this.state.password}
                            floatingLabelText="Password"
                            spellCheck="false"
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            onChange={this.onPasswordChange}
                            onKeyPress={this.onKeyPress}
                            errorText={passwordErrorMessage}
                            tabIndex={this.props.showingModal ? "-1" : "1"}
                        />
                    <mui.Toggle
                            name="showpassword"
                            label="Show password"
                            ref="showpassword"
                            onToggle={this.props.onShowPasswordToggle}
                            checked={this.props.showPassword}
                            tabIndex={this.props.showingModal ? "-1" : "2"}
                        />
                    <mui.FlatButton
                            secondary={true}
                            label="Mount"
                            ref="mountbutton"
                            className="main-action-button"
                            onClick={this.onMountClicked}
                            tabIndex={this.props.showingModal ? "-1" : "3"}
                        />
                </div>);
        }
    }

});



var UnmountComponent = React.createClass({

    onUnmountClicked: function() {
        if (this.props.showingModal) {
            return;
        }

        this.props.onUnmountClicked(
                this.refs.menu.props.menuItems[this.refs.menu.state.selectedIndex].payload,
                this.refs.restartfilesharing.isChecked());
    },
    
    render: function() {
        var menuItems = [];
        
        _.each(this.props.volumes, function(item, index) {
            if (item.numMountPoints > 0 && !IsReservedVolumeName(item.name)) {
                menuItems.push({payload: item.name, text: item.name});
            }
        });

        if (this.props.volumes.length === 0) {
            return (
                <div className="tab-content">
                    No encfs volumes found.
                </div>);
        }
        else if (menuItems.length === 0) {
            return (
                <div className="tab-content">
                    No mounted encfs volumes.
                </div>);
        }
        else {
            return (
                <div className="tab-content">
                    <mui.DropDownMenu
                            ref="menu"
                            menuItems={menuItems}
                            autoWidth={false} // Screws up width if not false, because inivisible in non-default tab
                        />
                    <mui.Checkbox
                            name="restartfilesharing"
                            label="Shutdown and restart file sharing services"
                            ref="restartfilesharing"
                            tabIndex={this.props.showingModal ? "-1" : "1"}
                        />
                    <mui.FlatButton
                            secondary={true}
                            label="Unmount"
                            className="main-action-button"
                            onClick={this.onUnmountClicked}
                            tabIndex={this.props.showingModal ? "-1" : "2"}
                        />
                </div>);
        }
    }

});


function DoesVolumeExist(volumes, volumeName) {
    var exists = !_.isUndefined(_.find(volumes, function(volume) {
        return volume.name.toLowerCase() === volumeName.toLowerCase();
    }));
    return exists;
}


var CreateComponent = React.createClass({

    getInitialState: function() {
        return {volumeName: "",
                password: "",
                confirmPassword: "",
                showButtonPressErrors: false};
    },

    onVolumeNameChange: function(e) {
        this.setState({volumeName: e.target.value,
                       showButtonPressErrors: false});
    },
    
    onPasswordChange: function(e) {
        this.setState({password: e.target.value,
                       showButtonPressErrors: false});
    },
    
    onConfirmPasswordChange: function(e) {
        this.setState({confirmPassword: e.target.value,
                       showButtonPressErrors: false});
    },

    onCreateClicked: function() {
        if (this.props.showingModal) {
            return;
        }

        var volumeNameStatus = GetVolumeNameStatus(this.refs.volumename.getValue() || "");
        var passwordStatus = GetPasswordStatus(this.refs.password.getValue() || "");
        var volumeNameExists = DoesVolumeExist(this.props.volumes, this.refs.volumename.getValue() || "");
        var isReserved = IsReservedVolumeName(this.refs.volumename.getValue());
        
        if (volumeNameStatus === STATUS_OK &&
                passwordStatus === STATUS_OK &&
                this.refs.password.getValue() === this.refs.confirmpassword.getValue() &&
                !volumeNameExists &&
                !isReserved)
        {
            this.props.onCreateClicked(this.refs.volumename.getValue(),
                                       this.refs.password.getValue());
        }
        else {
            this.setState({showButtonPressErrors: true});
        }
    },

    render: function() {
        var volumeName = this.state.volumeName;
        var volumeNameStatus = GetVolumeNameStatus(volumeName);
        var volumeNameErrorMessage;
        if (volumeNameStatus === STATUS_OK && this.state.showButtonPressErrors) {
            if (DoesVolumeExist(this.props.volumes, volumeName)) {
                volumeNameErrorMessage = "Volume already exists";
            }
            else if (IsReservedVolumeName(volumeName)) {
                volumeNameErrorMessage = "Reserved volume name";
            }
            else {
                volumeNameErrorMessage = null;
            }
        }
        else {
            volumeNameErrorMessage = GetErrorMessage(volumeNameStatus, this.state.showButtonPressErrors);
        }
        
        var passwordStatus = GetPasswordStatus(this.state.password);
        var passwordErrorMessage = GetErrorMessage(passwordStatus, this.state.showButtonPressErrors);
    
        var confirmPasswordStatus = GetPasswordStatus(this.state.confirmPassword);
        var confirmPasswordErrorMessage;
        if (this.state.showButtonPressErrors && this.state.password !== this.state.confirmPassword) {
            confirmPasswordErrorMessage = "Passwords don't match";
        }
        else {
            confirmPasswordErrorMessage = GetErrorMessage(confirmPasswordStatus, this.state.showButtonPressErrors);
        }
    
        return (
            <div className="tab-content">
                <mui.TextField
                        ref="volumename"
                        type="text"
                        name="volumename"
                        floatingLabelText="Volume Name"
                        spellCheck="false"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        onChange={this.onVolumeNameChange}
                        errorText={volumeNameErrorMessage}
                        tabIndex={this.props.showingModal ? "-1" : "1"}
                    />
                <mui.TextField
                        ref="password"
                        type={this.props.showPassword ? "text" : "password"}
                        name="password"
                        floatingLabelText="Password"
                        spellCheck="false"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        onChange={this.onPasswordChange}
                        errorText={passwordErrorMessage}
                        tabIndex={this.props.showingModal ? "-1" : "2"}
                    />
                <mui.TextField
                        ref="confirmpassword"
                        type={this.props.showPassword ? "text" : "password"}
                        name="confirmpassword"
                        floatingLabelText="Confirm Password"
                        spellCheck="false"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        onChange={this.onConfirmPasswordChange}
                        errorText={confirmPasswordErrorMessage}
                        tabIndex={this.props.showingModal ? "-1" : "3"}
                    />
                <mui.Toggle
                        name="showpassword"
                        label="Show password"
                        ref="showpassword"
                        onToggle={this.props.onShowPasswordToggle}
                        checked={this.props.showPassword}
                        tabIndex={this.props.showingModal ? "-1" : "4"}
                    />
                <div className="create-note">
                    <span className="create-note-note">Note:</span> Restart the device before storing
                    any data on your newly created encrypted volume. Failure to do so will make the
                    WD software index your content, storing file names and thumbnails unencrypted.
                </div>
                <mui.FlatButton
                        secondary={true}
                        label="Create"
                        className="main-action-button"
                        onClick={this.onCreateClicked}
                        tabIndex={this.props.showingModal ? "-1" : "5"}
                    />
            </div>);
    }

});

var DeleteComponent = React.createClass({

    getInitialState: function() {
        return {volumeName: "",
                showButtonPressErrors: false};
    },

    onVolumeNameChange: function(e) {
        this.setState({volumeName: e.target.value,
                       showButtonPressErrors: false});
    },
    
    onDeleteClicked: function() {
        if (this.props.showingModal) {
            return;
        }
    
        var volumeName = this.refs.volumename.getValue() || "";
        var exists = DoesVolumeExist(this.props.volumes, volumeName);
        var status = GetVolumeNameStatus(volumeName);
        if (status === STATUS_OK && exists) {
            // ??? Show confirmation dialog?
            this.props.onDeleteClicked(volumeName);
        }
        else {
            this.setState({showButtonPressErrors: true});
        }
    },

    render: function() {
        if (this.props.volumes.length === 0) {
            return (
                <div className="tab-content">
                    No encfs volumes found.
                </div>);
        }
        else {
            var status = GetVolumeNameStatus(this.state.volumeName);
            var errorMessage;
            if (status === STATUS_OK && this.state.showButtonPressErrors) {
                if (IsReservedVolumeName(this.state.volumeName)) {
                    errorMessage = "Reserved volume name";
                }
                else if (!DoesVolumeExist(this.props.volumes, this.state.volumeName)) {
                    errorMessage = "Nonexistent volume";
                }
            }
            else {
                errorMessage = GetErrorMessage(status, this.state.showButtonPressErrors);
            }

            return (
                <div className="tab-content">
                    <mui.TextField
                            ref="volumename"
                            type="text"
                            name="volumename"
                            floatingLabelText="Volume Name"
                            spellCheck="false"
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            onChange={this.onVolumeNameChange}
                            errorText={errorMessage}
                            tabIndex={this.props.showingModal ? "-1" : "1"}
                        />

                    <mui.FlatButton
                            secondary={true}
                            label="Delete"
                            className="main-action-button"
                            onClick={this.onDeleteClicked}
                            tabIndex={this.props.showingModal ? "-1" : "2"}
                        />
                </div>);
        }
    }

});



function createComponentsFromServerJson(json) {
    var result = [];
    _.each(json, function(output, index) {
        // Handle 3 (command return value) specially.
        if (output[0] !== MAX_MOUNT_POINTS) {
            // output[0]=0 (command line) is hidden using CSS since it reveals passwords.
            className = {   0: "output-command",
                            1: "output-stdout",
                            2: "output-stderr"
                        }[output[0]];
            result.push(
                <span className={className} key={"key" + index}>
                    {output[1]}
                </span>);
        }
        else {
            if (output[1] === 0) {
                result.push(
                    <span className="result-success" key={"key" + index}>
                        {"Success\n"}
                    </span>);
            }
            else {
                result.push(
                    <span className="result-failure" key={"key" + index}>
                        {"Failure\n"}
                    </span>);
            }
        }
    });
    
    return result;
}


var ProgressDialog = React.createClass({
    
    show: function() {
        this.refs.dialog.show();
    },
    
    // Scroll further down when adding more text if the scroll position is at the bottom of the
    // div before adding the text.
    isAtBottom: null,
    
    componentWillUpdate: function() {
        var div = this.refs.output.getDOMNode();
        var rect = div.getClientRects()[0];
        // For some reason left side can be greater than right side. Also include -2 just in case.
        this.isAtBottom = rect.height + div.scrollTop >= div.scrollHeight - 2;
    },
    
    componentDidUpdate: function(prevProps, prevState) {
        console.assert(_.isBoolean(this.isAtBottom));
        if (this.isAtBottom) {
            var div = this.refs.output.getDOMNode();
            div.scrollTop = div.scrollHeight;
        }

        if (!prevProps.complete && this.props.complete) {
            this.refs.okbutton.getDOMNode().focus();
        }
    },
    
    componentDidMount: function() {
        var div = this.refs.output.getDOMNode();
        div.scrollTop = div.scrollHeight;
    },
    
    render: function() {
        return (
            <mui.DialogWindow
                    ref="dialog"
                    className="mui-dialog"
                    actions={[<mui.FlatButton
                                    key="okbutton"
                                    secondary={true}
                                    onClick={this.props.onOkClicked}
                                    label="Ok"
                                    ref="okbutton"
                                    disabled={!this.props.complete}
                                />]}
                    openImmediately={true}
                    onDismiss={this.props.onDismiss}>
                <h3 className="mui-dialog-title">{this.props.title}</h3>
                <div ref="dialogContent" className="mui-dialog-content progress-dialog-content">
                    <mui.Paper zDepth={1} rounded={false}>
                        <div className="dialog-output-container" ref="output">
                            <pre>
                                {createComponentsFromServerJson(this.props.output)}
                            </pre>
                        </div>
                    </mui.Paper>
                </div>
            </mui.DialogWindow>);
    }
    
});



var TabBar = React.createClass({

    onClick: function(index) {
        this.props.onClick(index);
    },

    render: function() {

        var tabs =
            this.props.tabNames.map(function(tabName, index) {
                return (
                    <li className={"tab " + (this.props.activeTabIndex === index ? "tab-active" : "tab-inactive")}
                            key={"tab" + index}
                            onClick={this.onClick.bind(this, index)} >
                        <a onClick={this.onClick.bind(this, index)}
                                    tabIndex={this.props.showingModal ? "-1" : ("" + (10 + index))}
                                >
                            {tabName}
                        </a>
                    </li>);
            }.bind(this))

        return (
            <ul className="tabbar">
                { tabs }
            </ul>);
    }


});



var MainComponent = React.createClass({
    onModalWantsToClose: function() {
        if (this.props.serverRefreshHasFailed) {
             document.location.reload();
        }
        else {
            this.setState({showingModal: false});
        }
    },

    onModalOkClicked: function() {
        this.onModalWantsToClose();
    },
    
    onModalDismiss: function() {
        if (this.props.showModal) {
            this.refs.modal.show();
        }
        else {
            this.onModalWantsToClose();
        }
    },
    
    onMountClicked: function(volumeName, password) {
        this.setState({lastAttemptedMountVolumeName: volumeName});
        this.props.onMountClicked(this.props.volumes, volumeName, password);
    },

    onUnmountClicked: function(volumeName, restartFilesharing) {
        this.props.onUnmountClicked(this.props.volumes, volumeName, restartFilesharing);
    },
    
    onCreateClicked: function(volumeName, password) {
        this.props.onCreateClicked(this.props.volumes, volumeName, password);
    },
    
    onDeleteClicked: function(volumeName) {
        this.props.onDeleteClicked(this.props.volumes, volumeName);
    },
    
    onShowPasswordToggle: function(e) {
        this.setState({showPassword: e.target.checked});
    },
    
    getInitialState: function() {
    
        var numUnmountedVolumes = _.filter(this.props.volumes,
                                           function(volume) { return volume.numMountPoints < MAX_MOUNT_POINTS; })
                                    .length;
        var numMountedVolumes = _.filter(this.props.volumes,
                                         function(volume) { return volume.numMountPoints > 0; })
                                    .length;
        
        var startTab;
        if (numUnmountedVolumes > 0) {
            startTab = 0; // MountComponent
        }
        else if (numMountedVolumes > 0) {
            startTab = 1; // UnmountComponent
        }
        else {
            startTab = 2; // CreateComponent
        }
        
        return {showingModal: false,
                activeTabIndex: startTab,
                restartKeyIndex: 0,
                showPassword: false,
                lastAttemptedMountVolumeName: null
            };
    },
    
    componentWillReceiveProps: function(nextProps) {
        if (nextProps.showModal) {
            this.setState({showingModal: true});
        }
        else if (this.state.showingModal) {
            this.setState({restartKeyIndex: this.state.restartKeyIndex+1});
        }
    },
    
    onTabClick: function(tabIndex) {
        this.setState({activeTabIndex: tabIndex});
    },
    
    render: function() {
    
        var modal = null;
        if (this.state.showingModal) {
            modal =
                <ProgressDialog
                        key="modal"
                        ref="modal"
                        title={this.props.modalTitle}
                        complete={!this.props.showModal}
                        onOkClicked={this.onModalOkClicked}
                        output={this.props.modalOutput}
                        onDismiss={this.onModalDismiss}
                    />;
        }
        
        var activeTabContents = null;
        switch (this.state.activeTabIndex) {
            case 0:
                activeTabContents =
                    <MountComponent
                            key={"mountcomponent_" + this.state.restartKeyIndex}
                            volumes={this.props.volumes}
                            onMountClicked={this.onMountClicked}
                            showPassword={this.state.showPassword}
                            onShowPasswordToggle={this.onShowPasswordToggle}
                            showingModal={this.state.showingModal}
                            initialSelectedVolume={this.state.lastAttemptedMountVolumeName}
                        />
                break;
            case 1:
                activeTabContents =
                    <UnmountComponent
                            key={"unmouncomponent_" + this.state.restartKeyIndex}
                            volumes={this.props.volumes}
                            onUnmountClicked={this.onUnmountClicked}
                            showingModal={this.state.showingModal}
                        />
                break;
            case 2:
                activeTabContents =
                    <CreateComponent
                            key={"createcomponent_" + this.state.restartKeyIndex}
                            volumes={this.props.volumes}
                            onCreateClicked={this.onCreateClicked}
                            showPassword={this.state.showPassword}
                            onShowPasswordToggle={this.onShowPasswordToggle}
                            showingModal={this.state.showingModal}
                        />
                break;
            case 3:
                activeTabContents =
                    <DeleteComponent
                            key={"deletecomponent_" + this.state.restartKeyIndex}
                            volumes={this.props.volumes}
                            onDeleteClicked={this.onDeleteClicked}
                            showingModal={this.state.showingModal}
                        />
                break;
            default:
                console.assert(false);
        }
    
        return (
            <div className="main">
                {modal}
                <mui.Paper
                        className="main-paper"
                        innerClassName="main-paper-inner"
                        zDepth={2}>
                    <TabBar tabNames={["Mount", "Unmount", "Create", "Delete"]}
                                activeTabIndex={this.state.activeTabIndex}
                                onClick={this.onTabClick}
                                showingModal={this.state.showingModal}
                            />
                    {activeTabContents}
                </mui.Paper>
            </div>);
    },
});


function InitializationFailed(errorText) {
    React.render(
        <div />,
        document.getElementById("main"));

    React.render(
        (
            <div className="init-error">
                <h1>Encountered error</h1>
                <pre>
                    {errorText}
                </pre>
            </div>),
        document.getElementById("initerror"));
}


function Render(volumes, showModal, modalTitle, modalOutput, serverRefreshHasFailed) {
    React.render(
        <MainComponent
                volumes={volumes}
                showModal={showModal}
                modalTitle={modalTitle}
                modalOutput={modalOutput}
                onMountClicked={OnMountClicked}
                onUnmountClicked={OnUnmountClicked}
                onCreateClicked={OnCreateClicked}
                onDeleteClicked={OnDeleteClicked}
                serverRefreshHasFailed={serverRefreshHasFailed}
            />,
        document.getElementById("main")
    );
}


function CreatePostBody(fields) {
    var result = _.map(fields, function(fieldData, fieldName) {
                return encodeURIComponent(fieldName) + "=" + encodeURIComponent(fieldData);
            })
        .join("&")
        .replace(/%20/g, '+');
    
    return result;
}


function DoServerWork(volumes, postData, modalTitle, url) {
    
    Render(volumes, true, modalTitle, []);

    var body = CreatePostBody(postData);
    
    oboe({
            url: url,
            method: "POST",
            body: body,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
        .node("!.*", function(output) {
                Render(volumes, true, modalTitle, this.root());
            })
        .done(function(everything) {
                var status = everything.concat([[1, "\nRefreshing list of volumes...\n"]]);
              
                Render(volumes, true, modalTitle, status);
            
              
                Initialize(function(errors, volumes) {
                    if (errors) {
                        var status2 = status.concat([[2, errors + "\n"],[3, 1]]);
                        Render(volumes || [], false, modalTitle, status2);
                    }
                    else {
                        var status2 = status.concat([[3, 0]]);
                        Render(volumes || [], false, modalTitle, status2);
                    }
                });
            });
}


function OnMountClicked(volumes, volumeName, password) {
    var modalTitle = "Mounting " + volumeName;
    var postData = {
                        name: volumeName,
                        password: password
                    };
    
    DoServerWork(volumes, postData, modalTitle, MOUNT_URL);
}


function OnUnmountClicked(volumes, volumeName, restartFilesharing) {
    var modalTitle = "Unmounting " + volumeName;
    var postData = {
                        name: volumeName,
                        restartfilesharing: restartFilesharing ? "1" : "0"
                    };
    
    DoServerWork(volumes, postData, modalTitle, UNMOUNT_URL);
}


function OnCreateClicked(volumes, volumeName, password) {
    
    var modalTitle = "Creating " + volumeName;
    var postData = {
                        name: volumeName,
                        password: password,
                        cipher: "AES",
                        keysize: 128,
                        blocksize: 4096,
                        filenameencoding: 1
                    };
    
    DoServerWork(volumes, postData, modalTitle, CREATE_URL);
}


function OnDeleteClicked(volumes, volumeName) {

    var modalTitle = "Deleting " + volumeName;
    var postData = {name: volumeName};
    
    DoServerWork(volumes, postData, modalTitle, DELETE_URL);
}




function Initialize(callback) {

    oboe(GET_VOLUMES_URL)
        .done(function(output) {
            
            if (_.has(output, "error")) {
                callback("Couldn't get a list of encfs volumes on device.\nSTDERR:\n" + output["error"],
                        null);
            }
            else if (!_.has(output, "success")) {
                callback("Invalid format, expected dict with 'success' or 'error'", null);
            }
            else {
                var volumes = [];
                var errors = "";
                _.each(output["success"], function(volume) {
                    if (_.has(volume, "error")) {
                        errors += "Volume " + volume["name"] + " error '" + volume["error"] + "'\n";
                    }
                    else {
                        volumes.push(volume);
                    }
                });
                callback(errors, volumes);
            }
        })
        .fail(function(errorReport) {
            if (errorReport.statusCode && errorReport.statusCode !== 200) {
                callback("Server HTTP error code " + errorReport.statusCode +
                            (errorReport.body ? "\nResponse body:\n----\n" + errorReport.body : ""),
                        null);
            }
            else if (errorReport.thrown) {
                callback("Exception:\n" + errorReport.thrown.message + "\n" + errorReport.thrown.stack,
                        null);
            }
            else {
                callback("Unknown error", null);
            }
        });
}


// Parse x-www-form-urlenoded form data into a dict.
// Not extensively tested, will most likely NOT work in other situations with more complicated
// data in the form. Here the data is just alphanumeric.
function parseFormData(encodedData) {
    var fields = encodedData.split("&");
    var result = {};
    for (var i = 0; i < fields.length; i++) {
        var nameAndValue = fields[i].split("=");
        result[nameAndValue[0]] = nameAndValue[1];
    }
    return result;
}


function IsDemoMode() {
    return document.location.search.indexOf("demomode=1") != -1;
}



if (IsDemoMode()) {
    (function() {
        console.log("Running in demo mode. Changing AJAX calls to fake counterparts.");


        // In demo mode, we keep track of mounted/created/deleted volumes in this global variable.
        var demo_volumes = [];
        //            {"name":"Pictures", "numMountPoints":3, "password":"p4ssw0rd"},

        
        oboe = function(requestData) {
            var url;
            var formData = null;
            if (_.isString(requestData)) {
                // requestData is just a URL.
                console.assert(requestData == GET_VOLUMES_URL, requestData);
                url = requestData;
            }
            else {
                url = requestData.url;
                formData = parseFormData(requestData.body);
            }
            
            var callbackDone = null;
            
            if (url === GET_VOLUMES_URL) {
                setTimeout(
                    function() {
                        if (callbackDone) {
                            callbackDone({"success": demo_volumes});
                        }
                    },
                    1500);
            }
            else if (url === CREATE_URL) {
                setTimeout(
                    function() {
                        demo_volumes.push({name: formData['name'], numMountPoints: 3, password: formData['password']});
                        if (callbackDone) {
                            callbackDone([
                                [0,"\/home\/root\/wdcrypt\/shell_scripts\/createEncfs.sh " + formData['name'] + " 1 4096 1 " + formData['password'] + "\n"],
                                [2,"The directory \"\/media\/sdb1\/." + formData['name'] + "\/\" does not exist. Should it be created? (y,n) "],
                                [2,"The directory \"\/media\/sdb1\/" + formData['name'] + "\" does not exist. Should it be created? (y,n) "],
                                [1,"Creating new encrypted volume.\n"],
                                [1,"Please choose from one of the following options:\n enter \"x\" for expert configuration mode,\n enter \"p\" for pre-configured paranoia mode,\n anything else, or an empty line will select standard mode.\n?> \nManual configuration mode selected.\nThe following cipher algorithms are available:\n1. AES : 16 byte block cipher\n -- Supports key lengths of 128 to 256 bits\n -- Supports block sizes of 64 to 4096 bytes\n2. Blowfish : 8 byte block cipher\n -- Supports key lengths of 128 to 256 bits\n -- Supports block sizes of 64 to 4096 bytes\n\nEnter the number corresponding to your choice: \nSelected algorithm \"AES\"\n\nPlease select a key size in bits. The cipher you have chosen\nsupports sizes from 128 to 256 bits in increments of 64 bits.\nFor example: \n128, 192, 256\nSelected key size: \nUsing key size of 128 bits\n\nSelect a block size in bytes. The cipher you have chosen\nsupports sizes from 64 to 4096 bytes in increments of 16.\nOr just hit enter for the default (1024 bytes)\n\nfilesystem block size: \nUsing filesystem block size of 4096 bytes\n\nThe following filename encoding algorithms are available:\n1. Block : Block encoding, hides file name size somewhat\n2. Block32 : Block encoding with base32 output for case-sensitive systems\n3. Null : No encryption of filenames\n4. Stream : Stream encoding, keeps filenames as short as possible\n\nEnter the number corresponding to your choice: \nSelected algorithm \"Block\"\"\n\nEnable filename initialization vector chaining?\nThis makes filename encoding dependent on the complete path, \nrather then encoding each path element individually.\n[y]\/n: \nEnable per-file initialization vectors?\nThis adds about 8 bytes per file to the storage requirements.\nIt should not affect performance except possibly with applications\nwhich rely on block-aligned file io for performance.\n[y]\/n: \nExternal chained IV disabled, as both 'IV chaining'\nand 'unique IV' features are required for this option.\nEnable block authentication code headers\non every block in a file? This adds about 12 bytes per block\nto the storage requirements for a file, and significantly affects\nperformance but it also means [almost] any modifications or errors\nwithin a block will be caught and will cause a read error.\ny\/[n]: \nAdd random bytes to each block header?\nThis adds a performance penalty, but ensures that blocks\nhave different authentication codes. Note that you can\nhave the same benefits by enabling per-file initialization\nvectors, which does not come with as great of performance\npenalty. \nSelect a number of bytes, from 0 (no random bytes) to 8: \nEnable file-hole pass-through?\nThis avoids writing encrypted blocks when file holes are created.\n[y]\/n: \n\nConfiguration finished. The filesystem to be created has\nthe following properties:\n"],
                                [3,0]]);
                        }
                    },
                    1000);
            }
            else if (url === DELETE_URL) {
                setTimeout(
                    function() {
                        // Remove from the array.
                        for (var i = 0; i < demo_volumes.length; i++) {
                            if (demo_volumes[i].name === formData['name']) {
                                demo_volumes.splice(i, 1);
                                break;
                            }
                        }
                        if (callbackDone) {
                            callbackDone([
                                [0,"\/home\/root\/wdcrypt\/shell_scripts\/deleteEncfs.sh " + formData['name'] + "\n"],
                                [3,0]]);
                        }
                    },
                    1000);
            }
            else if (url === MOUNT_URL) {
                setTimeout(
                    function() {
                        var success = false;
                        for (var i = 0; i < demo_volumes.length; i++) {
                            if (demo_volumes[i].name === formData['name'] && demo_volumes[i].password === formData['password']) {
                                success = true;
                                demo_volumes[i].numMountPoints = 3;
                                break;
                            }
                        }
                        if (callbackDone) {
                            var data;
                            if (success) {
                                data = [
                                        [0,"\/home\/root\/wdcrypt\/shell_scripts\/mountEncfs.sh " + formData['name'] + " " + formData['password'] + "\n"],
                                        [1,"Mounting " + formData['name'] + " on \/media\/sdb1\/" + formData['name'] + "\n"],
                                        [1,"Mounting " + formData['name'] + " on \/DataVolume\/" + formData['name'] + "\n"],
                                        [1,"Mounting " + formData['name'] + " on \/var\/ftp\/Public\/" + formData['name'] + "\n"],
                                        [3,0]];
                            }
                            else {
                                data = [
                                        [0,"\/home\/root\/wdcrypt\/shell_scripts\/mountEncfs.sh " + formData['name'] + " " + formData['password'] + "\n"],
                                        [1,"Mounting " + formData['name'] + " on \/media\/sdb1\/" + formData['name'] + "\n"],
                                        [1,"Error decoding volume key, password incorrect\n"],
                                        [2,"encfs returned error 1\n"],
                                        [3,1]];
                            }
                           
                            callbackDone(data);
                        }
                    },
                    1000);
            }
            else if (url === UNMOUNT_URL) {
                setTimeout(
                    function() {
                        for (var i = 0; i < demo_volumes.length; i++) {
                            if (demo_volumes[i].name === formData['name']) {
                                demo_volumes[i].numMountPoints = 0;
                                break;
                            }
                        }
                        if (callbackDone) {
                            callbackDone([
                                [0,"\/home\/root\/wdcrypt\/shell_scripts\/unmountEncfs.sh " + formData['name'] + " " + formData['restartfilesharing'] + "\n"],
                                [1,"Unmounting \/media\/sdb1\/" + formData['name'] + "\n"],
                                [1,"Unmounting \/DataVolume\/" + formData['name'] + "\n"],
                                [1,"Unmounting \/var\/ftp\/Public\/" + formData['name'] + "\n"],
                                [3,0]]);
                        }
                    },
                    1000);
            }
            else {
                alert("Unexpected demo AJAX url: " + url);
            }
        
            var oboeChainObj = {
                done: function(callback) {
                    callbackDone = callback;
                    return oboeChainObj;
                },
                fail: function(callback) {
                    // Do nothing, the AJAX calls don't fail in demo mode
                    return oboeChainObj;
                },
                node: function(selector, callback) {
                    // Not used.
                    return oboeChainObj;
                },
            };
            return oboeChainObj;
        };
    })();
}


Initialize(function(errors, volumes) {
    if (errors) {
        InitializationFailed(errors);
    }
    else if(_.isArray(volumes)) {
        Render(volumes, false, "", []);
    }
    else {
        InitializationFailed("Unexpected result '" + volumes + "'");
    }
});
