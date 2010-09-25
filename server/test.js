
var inspect = require('./inspector').inspectDeep;
var http = require('http');

var sys = require('sys');
var fs = require('fs');
var path = require('path');
var paperboy = require('./node-paperboy/lib/paperboy');

var serverDir = path.dirname(__filename);
var webDir = path.join(serverDir, 'static');
var rootDir = path.dirname(serverDir);
var pluginDir = path.join(rootDir, 'platform', 'browser', 'plugins');

/**
 *
 */
var skyserver = {
  addService: function(method, url, action) {
    this._services.push({
      method: method,
      url: url,
      action: action
    });
  },
  listen: function(port, host) {
    http.createServer(this._onConnect.bind(this)).listen(port, host);
    sys.log('Server running at http://' + host + ':' + port + '/');
  },
  _onConnect: function(req, res) {
    sys.log('Request for ' + req.url);

    var matched = false;
    for (var i = 0; !matched && i < this._services.length; i++) {
      var service = this._services[i];
      if (req.method === service.method) {
        req.matches = service.url.exec(req.url);
        if (req.matches) {
          service.action(req, res);
          matched = true;
        }
      }
    }

    if (!matched) {
      paperboy.deliver(webDir, req, res);
    }
  },
  _services: []
};


/**
 *
 */
skyserver.addService('GET', /^\/index.html$/, function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body><h1>hi</h1></body></html>');
});

/**
 *
 */
skyserver.addService('GET', /^\/capabilities$/, function(req, res) {
  throw new Error('Not implemented');
}, { auth: false });

/**
 *
 */
skyserver.addService('POST', /^\/register\/new\/(.+)$/, function(req, res) {
  throw new Error('Not implemented');
}, { auth: false });

/**
 *
 */
skyserver.addService('POST', /^\/register\/login\/(.+)$/, function(req, res) {
  // TODO: This could be seen as a security flaw ;-)
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('{}');
}, { auth: false });

/**
 *
 */
skyserver.addService('GET', /^\/register\/logout$/, function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('Logged out');
}, { auth: false });

/**
 *
 */
skyserver.addService('GET', /^\/register\/userinfo\/(.+)$/, function(req, res) {
  throw new Error('Not implemented');
});

/**
 *
 */
skyserver.addService('POST', /^\/register\/lost\/$/, function(req, res) {
  throw new Error('Not implemented');
}, { auth: false });

/**
 *
 */
skyserver.addService('POST', /^\/register\/password\/(.+)$/, function(req, res) {
  throw new Error('Not implemented');
});

/**
 *
 */
skyserver.addService('GET', /^\/register\/userdata\/(.+)$/, function(req, res) {
  throw new Error('Not implemented');
});

/**
 *
 */
skyserver.addService('POST', /^\/settings\/$/, function(req, res) {
  throw new Error('Not implemented');
});

/**
 *
 */
skyserver.addService('GET', /^\/settings\/(.*)$/, function(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('{}');
});

/**
 * Retrieves one setting or all (depending on URL).
 */
skyserver.addService('GET', /^\/settings\/(.*)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  kwargs = request.kwargs
  user = request.user
  response.content_type='application/json'
  setting_name = kwargs['setting_name']
  if setting_name:
      try:
          response.body=simplejson.dumps(user.settings[setting_name])
      except KeyError:
          response.status = '404 Not Found'
          response.body = '%s not found' % setting_name
          response.content_type="text/plain"
  else:
      response.body=simplejson.dumps(user.settings)
  return response()
  */
});

/**
 *
 */
skyserver.addService('DELETE', /^\/settings\/(.+)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  kwargs = request.kwargs
  setting_name = kwargs['setting_name']
  try:
      del user.settings[setting_name]
      # get the user to appear dirty
      user.settings = user.settings
  except KeyError:
      response.status = "404 Not Found"
  return response()
  */
});

/*
def _split_path(request):
    path = request.kwargs['path']
    result = path.split('/', 1)
    if len(result) < 2:
        raise BadRequest("Project and path are both required.")
    parts = result[0].partition('+')
    if parts[1] == '':
        result.insert(0, request.user)
    else:
        result.insert(0, User.find_user(parts[0]))
        result[1] = parts[2]
    return result
*/

/**
 *
 */
skyserver.addService('GET', /^\/file\/listopen\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  result = user.files
  response.content_type = "application/json"
  response.body = simplejson.dumps(result)
  return response()
  */
});

/**
 *
 */
skyserver.addService('PUT', /^\/file\/at\/(.*)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user

  owner, project, path = _split_path(request)

  if (path == '' or path.endswith('/')) and request.body:
      raise BadRequest("Path ended in '/' indicating directory, but request contains body text")

  project = get_project(user, owner, project, create=True)

  if path.endswith('/'):
      if request.body != None and request.body != '':
          raise BadRequest("Path ended in '/' indicating directory, but request contains ")
      project.create_directory(path)
  elif path:
      project.save_file(path, request.body)
  log_event("filesave", request.user)
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/file\/at\/(.*)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user

  owner, project, path = _split_path(request)
  project = get_project(user, owner, project)

  mode = request.GET.get('mode', 'rw')
  contents = project.get_file(path, mode)

  _tell_file_event(user, project, path, 'open')

  response.body = contents
  response.content_type = "zombie/brains"
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/file\/close\/(.*)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user

  owner, project, path = _split_path(request)
  project = get_project(user, owner, project)

  project.close(path)
    return response()
  */
});

/**
 *
 */
skyserver.addService('DELETE', /^\/file\/at\/(.*)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user

  owner, project, path = _split_path(request)
  project = get_project(user, owner, project)

  project.delete(path)
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/file\/list\/(.*)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  path = request.kwargs['path']
  files = []

  if not path:
      projects = request.user.get_all_projects(True)
      for project in projects:
          if project.owner == user:
              files.append({ 'name':project.short_name })
          else:
              files.append({ 'name':project.owner.username + "+" + project.short_name })
  else:
      try:
          owner, project, path = _split_path(request)
      except BadRequest:
          project = path
          path = ''

      if project:
          project = get_project(user, owner, project)

      project_files = project.list_files(path)

      for item in project_files:
          reply = { 'name':item.short_name }
          _populate_stats(item, reply)
          files.append(reply)

    return _respond_json(response, files)
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/file\/list_all\/(.*)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  path = request.kwargs['path']
  files = []

  if not path:
      projects = request.user.get_all_projects(True)
      for project in projects:
          if project.owner == user:
              pname = project.short_name
          else:
              pname = project.owner.username + "+" + project.short_name
          metadata = project.metadata
          files.extend(pname + name
              for name in metadata.get_file_list())
          metadata.close()
  else:
      owner, project_name, path = _split_path(request)

      project = get_project(user, user, project_name)
      metadata = project.metadata

      files.extend(name for name in metadata.get_file_list(path))
      metadata.close()

  return _respond_json(response, files)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/project\/template\/(.*)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project_name']
  data = simplejson.loads(request.body)
  try:
      template_name = data['templateName']
  except KeyError:
      raise BadRequest("templateName not provided in request")

  project = get_project(user, user, project_name, create=True)
  project.install_template(template_name, data)

  response.content_type = "text/plain"
  response.body = ""
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/project\/rescan\/(.*$)/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project_name']
  project = get_project(user, user, project_name)
  job_body = dict(user=user.username, project=project_name)
  jobid = queue.enqueue("vcs", job_body, execute="skywriter.filesystem:rescan_project",
                      error_handler="skywriter.vcs:vcs_error",
                      use_db=True)
  response.content_type = "application/json"
  response.body = simplejson.dumps(dict(jobid=jobid,
                  taskname="Rescan %s" % project_name))
  return response()
  */
});

/**
 *
 */
skyserver.addService('PUT', /^\/file\/template\/(.*)/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  owner, project, path = _split_path(request)

  project = get_project(user, user, project, create=True)
  options = simplejson.loads(request.body)
  project.install_template_file(path, options)

  response.body = ""
  response.content_type = "text/plain"
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/file\/search\/(.*)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  query = request.GET.get("q", "")
  query = query.decode("utf-8")
  include = request.GET.get("i", "")
  limit = request.GET.get("limit", 20)
  try:
      limit = int(limit)
  except ValueError:
      limit = 20
  project_name = request.kwargs['project_name']

  project = get_project(user, user, project_name)
  result = project.search_files(query, limit, include)
  return _respond_json(response, result)
  */
});

/*
def _populate_stats(item, result):
    if isinstance(item, File):
        result['size'] = item.saved_size
        result['created'] = item.created.strftime("%Y%m%dT%H%M%S")
        result['modified'] = item.modified.strftime("%Y%m%dT%H%M%S")
        result['openedBy'] = [username for username in item.users]
*/

/**
 *
 */
skyserver.addService('GET', /^\/file\/stats\/(.+)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user

  owner, project, path = _split_path(request)
  project = get_project(user, owner, project)

  file_obj = project.get_file_object(path)
  result = {}
  _populate_stats(file_obj, result)
  return _respond_json(response, result)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/project\/import\/([^\/]+)/, function(req, res) {
  throw new Error('Not implemented');
  /*
  project_name = request.kwargs['project_name']
  input_file = request.POST['filedata']
  filename = input_file.filename
  _perform_import(request.user, project_name, filename,
                  input_file.file)
  return response()
  */
});

/*
def _perform_import(user, project_name, filename, fileobj):
    project = get_project(user, user, project_name, clean=True)
    if filename.endswith(".tgz") or filename.endswith(".tar.gz"):
        func = project.import_tarball
    elif filename.endswith(".zip"):
        func = project.import_zipfile
    else:
        raise BadRequest(
            "Import only supports .tar.gz, .tgz and .zip at this time.")

    func(filename, fileobj)
    return

def validate_url(url):
    if not url.startswith("http://") and not url.startswith("https://"):
        raise BadRequest("Invalid url: " + url)
    return url

def _download_data(url, request):
    """downloads the data to a temporary file, raising BadRequest
    if there are issues, doing a HEAD request first to ensure that
    the URL is good and also ensuring that the user has enough
    space available."""
    url = validate_url(url)
    try:
        resp = httplib2.Http().request(url, method="HEAD")
    except httplib2.HttpLib2Error, e:
        raise BadRequest(str(e))

    # check the content length to see if the user has enough quota
    # available before we download the whole file
    content_length = resp[0].get("content-length")
    if content_length:
        content_length = int(content_length)
        if not request.user.check_save(content_length):
            raise OverQuota()

    try:
        datafile = urllib2.urlopen(url)
    except urllib2.URLError, e:
        raise BadRequest(str(e))
    tempdatafile = tempfile.NamedTemporaryFile()
    tempdatafile.write(datafile.read())
    datafile.close()
    tempdatafile.seek(0)
    return tempdatafile
*/

/**
 *
 */
skyserver.addService('POST', /^\/project\/fromurl\/([^\/]+)/, function(req, res) {
  throw new Error('Not implemented');
  /*
  project_name = request.kwargs['project_name']

  tempdatafile = _download_data(request.body, request)
  url_parts = urlparse(url)
  filename = os.path.basename(url_parts[2])
  _perform_import(request.user, project_name, filename, tempdatafile)
  tempdatafile.close()
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/project\/export\/(.*(\.zip|\.tgz))/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user

  project_name = request.kwargs['project_name']
  project_name, extension = os.path.splitext(project_name)

  project = get_project(user, user, project_name)

  if extension == ".zip":
      func = project.export_zipfile
      response.content_type = "application/zip"
  else:
      response.content_type = "application/x-tar-gz"
      func = project.export_tarball

  output = func()
  def filegen():
      data = output.read(8192)
      while data:
          yield data
          data = output.read(8192)
      raise StopIteration
  response.app_iter = filegen()
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/preview\/at\/(.+)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user

  owner, project, path = _split_path(request)
  if owner != user:
      raise BadRequest("Preview of shared projects is not currently supported for security reasons.")

  project = get_project(user, owner, project)

  file_obj = project.get_file_object(path)
  response.body = str(file_obj.data)
  response.content_type = file_obj.mimetype
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/project\/rename\/(.+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user

  project_name = request.kwargs['project_name']
  project = get_project(user, user, project_name)
  project.rename(request.body)
  response.body = ""
  response.content_type = "text/plain"
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/network\/followers\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  return _users_followed_response(request.user, response)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/network\/follow\//, function(req, res) {
  throw new Error('Not implemented');
  /*
  users = _lookup_usernames(simplejson.loads(request.body))
  for other_user in users:
      request.user.follow(other_user)
  return _users_followed_response(request.user, response)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/network\/unfollow\//, function(req, res) {
  throw new Error('Not implemented');
  /*
  users = _lookup_usernames(simplejson.loads(request.body))
  for other_user in users:
      request.user.unfollow(other_user)
  return _users_followed_response(request.user, response)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/network\/followers\/tell\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  post = simplejson.loads(request.body)
  text = post.get('text', '*unspecified*')
  username = post.get('username', '')
  target_id = username and 'tell' or 'broadcast'
  connections = user.users_following_me()
  list = []
  for connection in connections:
      if not username or connection.following.username == username:
          connection.following.publish({
              'msgtargetid': target_id,
              'from': user.username,
              'text': text
          })
          list.append(connection.following.username)
          if username:
              break;
  response.body = simplejson.dumps(list)
  response.content_type = "text/plain"
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/group\/list\/all/, function(req, res) {
  throw new Error('Not implemented');
  /*
  groups = request.user.get_groups()
  groups = [ group.name for group in groups ]
  return _respond_json(response, groups)
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/group\/list\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  group_name = request.kwargs['group']
  group = request.user.get_group(group_name, raise_on_not_found=True)
  members = group.get_members()
  members = [ member.user.username for member in members ]
  return _respond_json(response, members)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/group\/remove\/all\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  group_name = request.kwargs['group']
  group = request.user.get_group(group_name, raise_on_not_found=True)
  rows = 0
  rows += group.remove_all_members()
  rows += group.remove()
  return _respond_json(response, rows)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/group\/remove\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  group_name = request.kwargs['group']
  group = request.user.get_group(group_name, raise_on_not_found=True)
  users = _lookup_usernames(simplejson.loads(request.body))
  rows = 0
  for other_user in users:
      rows += group.remove_member(other_user)
  members = group.get_members()
  if len(members) == 0:
      rows += group.group()
  return _respond_json(response, rows)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/group\/add\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  group_name = request.kwargs['group']
  group = request.user.get_group(group_name, create_on_not_found=True)
  users = _lookup_usernames(simplejson.loads(request.body))
  for other_user in users:
      group.add_member(other_user)
  return _respond_blank(response)
  */
});

/*
def _respond_blank(response):
    response.body = ""
    response.content_type = "text/plain"
    return response()

def _respond_json(response, data):
    response.body = simplejson.dumps(data)
    response.content_type = "application/json"
    return response()

def _lookup_usernames(usernames):
    def lookup_username(username):
        user = User.find_user(username)
        if user == None:
            raise BadRequest("Username not found: %s" % username)
        return user
    return map(lookup_username, usernames)

def _users_followed_response(user, response):
    list = user.users_i_follow()
    list = [connection.followed.username for connection in list]
    response.body = simplejson.dumps(list)
    response.content_type = "text/plain"
    return response()

def _users_following_response(user, response):
    list = user.users_following_me()
    list = [connection.following.username for connection in list]
    response.body = simplejson.dumps(list)
    response.content_type = "text/plain"
    return response()

def _tell_file_event(user, project, path, event):
    followers = user.users_following_me()
    followers = [follower.following.username for follower in followers if follower.following]
    # find the owner
    isMyProject = _is_project_shared(project, user)
    print "*** 2 " + str(isMyProject)
    for follower in followers:
        #try:
            member = User.find_user(follower)
            if isMyProject and _is_project_shared(project, member):
                # we can safely send a message
                member.publish({
                    'msgtargetid': 'file_event',
                    'from':    user.username,
                    'event':   event,
                    'project': project.name,
                    'owner':   project.owner.username,
                    'path':    path,
                })
        #except:
            #pass

def _is_project_shared(project, user):
    return project.owner.username == user.username or project.owner.is_project_shared(project, user)
*/

/**
 * List all project shares
 */
skyserver.addService('GET', /^\/share\/list\/all\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  data = request.user.get_sharing()
  return _respond_json(response, data)
  */
});

/**
 * List sharing for a given project
 */
skyserver.addService('GET', /^\/share\/list\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  project = get_project(request.user, request.user, request.kwargs['project'])
  data = request.user.get_sharing(project)
  return _respond_json(response, data)
  */
});

/**
 * List sharing for a given project and member
 */
skyserver.addService('GET', /^\/share\/list\/([^\/]+)\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  project = get_project(request.user, request.user, request.kwargs['project'])
  member = request.user.find_member(request.kwargs['member'])
  data = request.user.get_sharing(project, member)
  return _respond_json(response, data)
  */
});

/**
 * Remove all sharing from a project
 */
skyserver.addService('POST', /^\/share\/remove\/([^\/]+)\/all\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  project = get_project(request.user, request.user, request.kwargs['project'])
  data = request.user.remove_sharing(project)
  return _respond_json(response, data)
  */
});

/**
 * Remove project sharing from a given member
 */
skyserver.addService('POST', /^\/share\/remove\/([^\/]+)\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  project = get_project(request.user, request.user, request.kwargs['project'])
  member = request.user.find_member(request.kwargs['member'])
  data = request.user.remove_sharing(project, member)
  return _respond_json(response, data)
  */
});

/**
 * Add a member to the sharing list for a project
 */
skyserver.addService('POST', /^\/share\/add\/([^\/]+)\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  project = get_project(request.user, request.user, request.kwargs['project'])
  member = request.user.find_member(request.kwargs['member'])
  options = simplejson.loads(request.body)
  request.user.add_sharing(project, member, options)
  return _respond_blank(response)
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/share\/tell\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project']
  post = simplejson.loads(request.body)
  text = post.get('text', '*unspecified*')
  # find the owner
  parts = project_name.partition('+')
  if parts[1]:
      owner = User.find_user(parts[0])
      project_name = parts[2]
  else:
      owner = user
  project = get_project(user, owner, project_name)
  isMyProject = _is_project_shared(project, user)
  # notify recipients
  list = []
  recipients = post.get('recipients', [])
  for recipient in recipients:
      #try:
          member = User.find_user(recipient)
          if isMyProject and _is_project_shared(project, member):
              # we can safely send a message
              member.publish({
                  'msgtargetid': 'share_tell',
                  'from': user.username,
                  'text': text
              })
              list.append(recipient)
      #except:
      #    pass
  response.body = simplejson.dumps(list)
  response.content_type = "text/plain"
  return response()
  */
});

/**
 * List all the members with view settings on me
 */
skyserver.addService('GET', /^\/viewme\/list\/all\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  data = request.user.get_viewme()
  return _respond_json(response, data)
  */
});

/**
 * List the view settings for a given member
 */
skyserver.addService('GET', /^\/viewme\/list\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  member = request.user.find_member(request.kwargs['member'])
  data = request.user.get_viewme(member)
  return _respond_json(response, data)
  */
});

/**
 * Alter the view setting for a given member
 */
skyserver.addService('POST', /^\/viewme\/set\/([^\/]+)\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  member = request.user.find_member(request.kwargs['member'])
  value = request.kwargs['value']
  data = request.user.set_viewme(member, value)
  return _respond_json(response, data)
  */
});

/**
 * Handle a request for mobwrite synchronization.
 * We talk to mobwrite either in-process for development or using a socket
 * which would be more common in live.
 */
skyserver.addService('POST', /^\/mobwrite\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  c.stats.incr("mobwrite_DATE")
  question = urllib.unquote(request.body)
  # Hmmm do we need to handle 'p' requests? q.py does.
  mode = None
  if question.find("p=") == 0:
      mode = "script"
  elif question.find("q=") == 0:
      mode = "text"
  else:
      raise BadRequest("Missing q= or p=")
  question = question[2:]
  question = "H:" + str(request.user.username) + "\n" + question

  # Java: Class.forName(...) There *has* to be a better way in python?
  if c.mobwrite_implementation == "MobwriteInProcess":
      worker = MobwriteInProcess()
  if c.mobwrite_implementation == "MobwriteTelnetProxy":
      worker = MobwriteTelnetProxy()
  if c.mobwrite_implementation == "MobwriteHttpProxy":
      worker = MobwriteHttpProxy()

  #log.debug("\n\nQUESTION:\n" + question);
  answer = worker.processRequest(question)
  #log.debug("\nANSWER:\n" + answer + "\n");

  if mode == "text":
      response.body = answer + "\n\n"
      response.content_type = "text/plain"
  else:
      answer = answer.replace("\\", "\\\\").replace("\"", "\\\"")
      answer = answer.replace("\n", "\\n").replace("\r", "\\r")
      answer = "mobwrite.callback(\"%s\");" % answer
      response.body = answer
      response.content_type = "application/javascript"
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/vcs\/clone\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  source = request.POST.get("source")
  taskname = "Clone/checkout"
  if source:
        taskname += " from %s" % (source)
  jobid = vcs.clone(user, **dict(request.POST))
  response.content_type = "application/json"
  response.body = simplejson.dumps(dict(jobid=jobid, taskname=taskname))
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/vcs\/command\/(.*)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project_name']
  request_info = simplejson.loads(request.body)
  args = request_info['command']
  log.debug("VCS command: %s", args)
  kcpass = request_info.get('kcpass')

  try:
      taskname = "vcs %s command" % (args[0])
  except IndexError:
      taskname = "vcs command"

  # special support for clone/checkout
  if vcs.is_new_project_command(args):
      raise BadRequest("Use /vcs/clone/ to create a new project")
  else:
      project = get_project(user, user, project_name)
      jobid = vcs.run_command(user, project, args, kcpass)

  response.content_type = "application/json"
  response.body = simplejson.dumps(dict(jobid=jobid, taskname=taskname))
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/vcs\/remoteauth\/(.*)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project_name']

  project = get_project(user, user, project_name)
  metadata = project.metadata
  value = metadata.get(vcs.AUTH_PROPERTY, "")

  response.content_type = "text/plain"
  response.body = value.encode("utf8")
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/vcs\/setauth\/(.*)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project_name']
  project = get_project(user, user, project_name)

  try:
      kcpass = request.POST['kcpass']
      atype = request.POST['type']
      remote_auth = request.POST['remoteauth']
  except KeyError:
      raise BadRequest("Request must include kcpass, type and remoteauth.")

  if remote_auth != vcs.AUTH_WRITE and remote_auth != vcs.AUTH_BOTH:
      raise BadRequest("Remote auth type must be %s or %s" %
                      (vcs.AUTH_WRITE, vcs.AUTH_BOTH))
  keychain = vcs.KeyChain(user, kcpass)

  body = ""

  if atype == "password":
      try:
          username = request.POST['username']
          password = request.POST['password']
      except KeyError:
          raise BadRequest("Request must include username and password")

      keychain.set_credentials_for_project(project, remote_auth, username,
                                            password)
  elif atype == "ssh":
      # set the project to use the SSH key and return the public key
      body = keychain.set_ssh_for_project(project, remote_auth)[0]
  else:
      raise BadRequest("auth type must be ssh or password")

  response.content_type = "application/json"
  response.body = body
  return response()
  */
});

/**
 *
*/
skyserver.addService('GET', /^\/vcs\/getkey\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  try:
      kcpass = request.POST['kcpass']
  except KeyError:
      kcpass = None

  if kcpass is None:
      pubkey = vcs.KeyChain.get_ssh_public_key(user)
  else:
      keychain = vcs.KeyChain(user, kcpass)
      pubkey = keychain.get_ssh_key()[0]

  response.content_type = "application/x-ssh-key"
  response.body = pubkey
  return response()
  */
});

/*
def ask_mobwrite(question, user):
    """Handle a request for mobwrite synchronization.

    We talk to mobwrite either in-process for development or using a socket
    which would be more common in live."""
    if not question:
        return ""

    c.stats.incr("mobwrite_DATE")
    question = "H:" + str(user.username) + "\n" + question

    # Java: Class.forName(...) There *has* to be a better way in python?
    if c.mobwrite_implementation == "MobwriteInProcess":
        worker = MobwriteInProcess()
    if c.mobwrite_implementation == "MobwriteTelnetProxy":
        worker = MobwriteTelnetProxy()
    if c.mobwrite_implementation == "MobwriteHttpProxy":
        worker = MobwriteHttpProxy()

    #log.debug("\n\nQUESTION:\n" + question);
    answer = worker.processRequest(question)
    #log.debug("\nANSWER:\n" + answer + "\n");

    return answer
*/

/**
 *
 */
skyserver.addService('GET', /^\/messages\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  c.stats.incr("messages_DATE")
  user = request.user
  if user is None:
      body = u"[]"
  else:
      question = request.body
      msgs = [simplejson.loads(msg) for msg in user.pop_messages()]
      if "collab" in c.capabilities:
          answer = ask_mobwrite(question, user) + "\n\n"
          msgs.append({
              "msgtargetid": "mobwrite",
              "from": user.username,
              "text": answer
          })
      body = simplejson.dumps(msgs)

  response.content_type = "application/json"
  response.body = body.encode("utf8")
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/stats\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  username = request.username
  if username not in c.stats_users:
      raise NotAuthorized("Not allowed to access stats")
  today = date.today().strftime("%Y%m%d")
  keys = ["exceptions_" + today,
          'requests_' + today,
          'mobwrite_' + today,
          'messages_' + today,
          'users',
          'files',
          'projects',
          'vcs_' + today]
  more_keys = [k.replace("_DATE", "_" + today) for k in c.stats_display]
  keys.extend(more_keys)
  result = c.stats.multiget(keys)
  response.content_type = "application/json"
  response.body = simplejson.dumps(result)
  return response()
  */
});

/**
 *
 */
skyserver.addService('PUT', /^\/project\/deploy\/([^\/]+)\/setup$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project_name']
  project = get_project(user, user, project_name)

  data = simplejson.loads(request.body)
  deploy_options = dict(remote_host = data.get("remoteHost"),
      remote_directory = data.get("remoteDirectory"),
      type = data.get("connType"))

  try:
      pdo = deploy.ProjectDeploymentOptions(project, **deploy_options)
      pdo.save()
  except deploy.InvalidConfiguration, e:
      raise BadRequest(e.message)

  keychain = deploy.DeploymentKeyChain(user, data['kcpass'])
  if data['authType'] == "ssh":
      keychain.set_ssh_for_project(project, username=data['username'])
  else:
      keychain.set_credentials_for_project(project,
          username=data['username'],
          password=data['password'])

  project.metadata.close()

  response.content_type="application/json"
  response.body=""
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/project\/deploy\/([^\/]+)\/setup$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project_name']
  project = get_project(user, user, project_name)

  data = simplejson.loads(request.body)

  response.content_type="application/json"

  pdo = deploy.ProjectDeploymentOptions.get(project)
  if not pdo:
      response.body = simplejson.dumps(None)
      return response()

  kc = deploy.DeploymentKeyChain(user, data['kcpass'])
  cred = kc.get_credentials_for_project(project)

  result = dict(remoteHost=pdo.remote_host,
      remoteDirectory=pdo.remote_directory,
      connType=pdo.type, authType=cred['type'],
      username=cred['username'])

  result['password'] = cred['password'] \
      if cred['type'] == "password" else ""

  response.body = simplejson.dumps(result)
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/project\/deploy\/([^\/]+)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  user = request.user
  project_name = request.kwargs['project_name']
  data = simplejson.loads(request.body)
  kcpass = data['kcpass']

  options = dict()
  if "dryRun" in data:
      options['dry_run'] = data['dryRun']

  project = get_project(user, user, project_name)
  response.content_type = "application/json"
  try:
      jobid = deploy.run_deploy(user, project, kcpass, options)
  except deploy.NotConfigured, e:
      response.body = simplejson.dumps(dict(error=str(e),
          notConfigured=True))
      response.status = "400 Bad Request"
      return response()

  response.body = simplejson.dumps(dict(jobid=jobid,
      taskname="deploy %s" % (project_name)))
  return response()
  */
});

/*
def _plugin_does_not_exist(response, plugin_name):
    response.status = "404 Not Found"
    response.content_type = "text/plain"
    response.body = "Plugin '" + plugin_name + "' does not exist."
    return response()

def _plugin_response(response, path=None, plugin_list=None, log_user=None,
        environment='main'):
    response.content_type = "application/json"

    if plugin_list is None:
        plugin_list = plugins.find_plugins(path)

    def validate_env(plugin):
        metadata = plugin.metadata
        if 'environments' not in metadata:
            return True
        environments = metadata['environments']
        return environment not in environments or environments[environment]

    metadata = dict((plugin.name, plugin.metadata)
        for plugin in plugins.filter_plugins(plugin_list, validate_env))

    if log_user:
        log_event("userplugin", log_user, len(metadata))

    response.body = simplejson.dumps(metadata)
    return response()
*/

/**
 * Hacked
 */
skyserver.addService('GET', /^\/plugin\/register\/defaults$/, function(req, res) {
  // Clearly this is a cached hack
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('{"text_editor": {"reloadURL": "/plugin/reload/text_editor", "resourceURL": "/plugin/file/supported/text_editor/resources/", "description": "Canvas-based text editor component and many common editing commands", "tiki:resources": [{"url": "/plugin/script/supported/text_editor/commands/editing.js", "type": "script", "id": "text_editor:commands/editing.js", "name": "commands/editing.js"}, {"url": "/plugin/script/supported/text_editor/commands/editor.js", "type": "script", "id": "text_editor:commands/editor.js", "name": "commands/editor.js"}, {"url": "/plugin/script/supported/text_editor/commands/movement.js", "type": "script", "id": "text_editor:commands/movement.js", "name": "commands/movement.js"}, {"url": "/plugin/script/supported/text_editor/commands/scrolling.js", "type": "script", "id": "text_editor:commands/scrolling.js", "name": "commands/scrolling.js"}, {"url": "/plugin/script/supported/text_editor/controllers/layoutmanager.js", "type": "script", "id": "text_editor:controllers/layoutmanager.js", "name": "controllers/layoutmanager.js"}, {"url": "/plugin/script/supported/text_editor/controllers/search.js", "type": "script", "id": "text_editor:controllers/search.js", "name": "controllers/search.js"}, {"url": "/plugin/script/supported/text_editor/controllers/undo.js", "type": "script", "id": "text_editor:controllers/undo.js", "name": "controllers/undo.js"}, {"url": "/plugin/script/supported/text_editor/models/buffer.js", "type": "script", "id": "text_editor:models/buffer.js", "name": "models/buffer.js"}, {"url": "/plugin/script/supported/text_editor/models/textstorage.js", "type": "script", "id": "text_editor:models/textstorage.js", "name": "models/textstorage.js"}, {"url": "/plugin/script/supported/text_editor/tests/controllers/testLayoutmanager.js", "type": "script", "id": "text_editor:tests/controllers/testLayoutmanager.js", "name": "tests/controllers/testLayoutmanager.js"}, {"url": "/plugin/script/supported/text_editor/tests/models/testTextstorage.js", "type": "script", "id": "text_editor:tests/models/testTextstorage.js", "name": "tests/models/testTextstorage.js"}, {"url": "/plugin/script/supported/text_editor/tests/testScratchcanvas.js", "type": "script", "id": "text_editor:tests/testScratchcanvas.js", "name": "tests/testScratchcanvas.js"}, {"url": "/plugin/script/supported/text_editor/tests/utils/testRect.js", "type": "script", "id": "text_editor:tests/utils/testRect.js", "name": "tests/utils/testRect.js"}, {"url": "/plugin/script/supported/text_editor/utils/rect.js", "type": "script", "id": "text_editor:utils/rect.js", "name": "utils/rect.js"}, {"url": "/plugin/script/supported/text_editor/views/canvas.js", "type": "script", "id": "text_editor:views/canvas.js", "name": "views/canvas.js"}, {"url": "/plugin/script/supported/text_editor/views/editor.js", "type": "script", "id": "text_editor:views/editor.js", "name": "views/editor.js"}, {"url": "/plugin/script/supported/text_editor/views/gutter.js", "type": "script", "id": "text_editor:views/gutter.js", "name": "views/gutter.js"}, {"url": "/plugin/script/supported/text_editor/views/scroller.js", "type": "script", "id": "text_editor:views/scroller.js", "name": "views/scroller.js"}, {"url": "/plugin/script/supported/text_editor/views/text.js", "type": "script", "id": "text_editor:views/text.js", "name": "views/text.js"}, {"url": "/plugin/script/supported/text_editor/views/textinput.js", "type": "script", "id": "text_editor:views/textinput.js", "name": "views/textinput.js"}], "dependencies": {"completion": "0.0.0", "undomanager": "0.0.0", "settings": "0.0.0", "canon": "0.0.0", "rangeutils": "0.0.0", "traits": "0.0.0", "theme_manager": "0.0.0", "keyboard": "0.0.0", "edit_session": "0.0.0", "syntax_manager": "0.0.0"}, "testmodules": ["tests/controllers/testLayoutmanager", "tests/models/testTextstorage", "tests/testScratchcanvas", "tests/utils/testRect"], "provides": [{"action": "new", "pointer": "views/editor#EditorView", "ep": "factory", "name": "text_editor"}, {"predicates": {"isTextView": true}, "pointer": "commands/editing#backspace", "ep": "command", "key": "backspace", "name": "backspace"}, {"predicates": {"isTextView": true}, "pointer": "commands/editing#deleteCommand", "ep": "command", "key": "delete", "name": "delete"}, {"description": "Delete all lines currently selected", "key": "ctrl_d", "predicates": {"isTextView": true}, "pointer": "commands/editing#deleteLines", "ep": "command", "name": "deletelines"}, {"description": "Create a new, empty line below the current one", "key": "ctrl_return", "predicates": {"isTextView": true}, "pointer": "commands/editing#openLine", "ep": "command", "name": "openline"}, {"description": "Join the current line with the following", "key": "ctrl_shift_j", "predicates": {"isTextView": true}, "pointer": "commands/editing#joinLines", "ep": "command", "name": "joinline"}, {"params": [{"defaultValue": "", "type": "text", "name": "text", "description": "The text to insert"}], "pointer": "commands/editing#insertText", "ep": "command", "name": "insertText"}, {"predicates": {"completing": false, "isTextView": true}, "pointer": "commands/editing#newline", "ep": "command", "key": "return", "name": "newline"}, {"predicates": {"completing": false, "isTextView": true}, "pointer": "commands/editing#tab", "ep": "command", "key": "tab", "name": "tab"}, {"predicates": {"isTextView": true}, "pointer": "commands/editing#untab", "ep": "command", "key": "shift_tab", "name": "untab"}, {"predicates": {"isTextView": true}, "ep": "command", "name": "move"}, {"description": "Repeat the last search (forward)", "pointer": "commands/editor#findNextCommand", "ep": "command", "key": "ctrl_g", "name": "findnext"}, {"description": "Repeat the last search (backward)", "pointer": "commands/editor#findPrevCommand", "ep": "command", "key": "ctrl_shift_g", "name": "findprev"}, {"predicates": {"completing": false, "isTextView": true}, "pointer": "commands/movement#moveDown", "ep": "command", "key": "down", "name": "move down"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#moveLeft", "ep": "command", "key": "left", "name": "move left"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#moveRight", "ep": "command", "key": "right", "name": "move right"}, {"predicates": {"completing": false, "isTextView": true}, "pointer": "commands/movement#moveUp", "ep": "command", "key": "up", "name": "move up"}, {"predicates": {"isTextView": true}, "ep": "command", "name": "select"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectDown", "ep": "command", "key": "shift_down", "name": "select down"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectLeft", "ep": "command", "key": "shift_left", "name": "select left"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectRight", "ep": "command", "key": "shift_right", "name": "select right"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectUp", "ep": "command", "key": "shift_up", "name": "select up"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#moveLineEnd", "ep": "command", "key": ["end", "ctrl_right"], "name": "move lineend"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectLineEnd", "ep": "command", "key": ["shift_end", "ctrl_shift_right"], "name": "select lineend"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#moveDocEnd", "ep": "command", "key": "ctrl_down", "name": "move docend"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectDocEnd", "ep": "command", "key": "ctrl_shift_down", "name": "select docend"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#moveLineStart", "ep": "command", "key": ["home", "ctrl_left"], "name": "move linestart"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectLineStart", "ep": "command", "key": ["shift_home", "ctrl_shift_left"], "name": "select linestart"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#moveDocStart", "ep": "command", "key": "ctrl_up", "name": "move docstart"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectDocStart", "ep": "command", "key": "ctrl_shift_up", "name": "select docstart"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#moveNextWord", "ep": "command", "key": ["alt_right"], "name": "move nextword"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectNextWord", "ep": "command", "key": ["alt_shift_right"], "name": "select nextword"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#movePreviousWord", "ep": "command", "key": ["alt_left"], "name": "move prevword"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectPreviousWord", "ep": "command", "key": ["alt_shift_left"], "name": "select prevword"}, {"predicates": {"isTextView": true}, "pointer": "commands/movement#selectAll", "ep": "command", "key": ["ctrl_a", "meta_a"], "name": "select all"}, {"predicates": {"isTextView": true}, "ep": "command", "name": "scroll"}, {"predicates": {"isTextView": true}, "pointer": "commands/scrolling#scrollDocStart", "ep": "command", "key": "ctrl_home", "name": "scroll start"}, {"predicates": {"isTextView": true}, "pointer": "commands/scrolling#scrollDocEnd", "ep": "command", "key": "ctrl_end", "name": "scroll end"}, {"predicates": {"isTextView": true}, "pointer": "commands/scrolling#scrollPageDown", "ep": "command", "key": "pagedown", "name": "scroll down"}, {"predicates": {"isTextView": true}, "pointer": "commands/scrolling#scrollPageUp", "ep": "command", "key": "pageup", "name": "scroll up"}, {"pointer": "commands/editor#lcCommand", "description": "Change all selected text to lowercase", "withKey": "CMD SHIFT L", "ep": "command", "name": "lc"}, {"pointer": "commands/editor#detabCommand", "description": "Convert tabs to spaces.", "params": [{"defaultValue": null, "type": "text", "name": "tabsize", "description": "Optionally, specify a tab size. (Defaults to setting.)"}], "ep": "command", "name": "detab"}, {"pointer": "commands/editor#entabCommand", "description": "Convert spaces to tabs.", "params": [{"defaultValue": null, "type": "text", "name": "tabsize", "description": "Optionally, specify a tab size. (Defaults to setting.)"}], "ep": "command", "name": "entab"}, {"pointer": "commands/editor#trimCommand", "description": "trim trailing or leading whitespace from each line in selection", "params": [{"defaultValue": "both", "type": {"data": [{"name": "left"}, {"name": "right"}, {"name": "both"}], "name": "selection"}, "name": "side", "description": "Do we trim from the left, right or both"}], "ep": "command", "name": "trim"}, {"pointer": "commands/editor#ucCommand", "description": "Change all selected text to uppercase", "withKey": "CMD SHIFT U", "ep": "command", "name": "uc"}, {"predicates": {"isTextView": true}, "pointer": "controllers/undo#undoManagerCommand", "ep": "command", "key": ["ctrl_shift_z"], "name": "redo"}, {"predicates": {"isTextView": true}, "pointer": "controllers/undo#undoManagerCommand", "ep": "command", "key": ["ctrl_z"], "name": "undo"}, {"description": "The distance in characters between each tab", "defaultValue": 8, "type": "number", "ep": "setting", "name": "tabstop"}, {"description": "Customize the keymapping", "defaultValue": "{}", "type": "text", "ep": "setting", "name": "customKeymapping"}, {"description": "The keymapping to use", "defaultValue": "standard", "type": "text", "ep": "setting", "name": "keymapping"}, {"description": "The editor font size in pixels", "defaultValue": 14, "type": "number", "ep": "setting", "name": "fontsize"}, {"description": "The editor font face", "defaultValue": "Monaco, Lucida Console, monospace", "type": "text", "ep": "setting", "name": "fontface"}, {"defaultValue": {"color": "#e5c138", "paddingLeft": 5, "backgroundColor": "#4c4a41", "paddingRight": 10}, "ep": "themevariable", "name": "gutter"}, {"defaultValue": {"color": "#e6e6e6", "selectedTextBackgroundColor": "#526da5", "backgroundColor": "#2a211c", "cursorColor": "#879aff", "unfocusedCursorBackgroundColor": "#73171e", "unfocusedCursorColor": "#ff0033"}, "ep": "themevariable", "name": "editor"}, {"defaultValue": {"comment": "#666666", "directive": "#999999", "keyword": "#42A8ED", "addition": "#FFFFFF", "plain": "#e6e6e6", "deletion": "#FFFFFF", "error": "#ff0000", "operator": "#88BBFF", "identifier": "#D841FF", "string": "#039A0A"}, "ep": "themevariable", "name": "highlighterFG"}, {"defaultValue": {"addition": "#008000", "deletion": "#800000"}, "ep": "themevariable", "name": "highlighterBG"}, {"defaultValue": {"nibStrokeStyle": "rgb(150, 150, 150)", "fullAlpha": 1.0, "barFillStyle": "rgb(0, 0, 0)", "particalAlpha": 0.29999999999999999, "barFillGradientBottomStop": "rgb(44, 44, 44)", "backgroundStyle": "#2A211C", "thickness": 17, "padding": 5, "trackStrokeStyle": "rgb(150, 150, 150)", "nibArrowStyle": "rgb(255, 255, 255)", "barFillGradientBottomStart": "rgb(22, 22, 22)", "barFillGradientTopStop": "rgb(40, 40, 40)", "barFillGradientTopStart": "rgb(90, 90, 90)", "nibStyle": "rgb(100, 100, 100)", "trackFillStyle": "rgba(50, 50, 50, 0.8)"}, "ep": "themevariable", "name": "scroller"}, {"description": "Event: Notify when something within the editor changed.", "params": [{"required": true, "name": "pointer", "description": "Function that is called whenever a change happened."}], "ep": "extensionpoint", "name": "editorChange"}, {"description": "Decoration for the gutter", "ep": "extensionpoint", "name": "gutterDecoration"}, {"description": "Line number decoration for the gutter", "pointer": "views/gutter#lineNumbers", "ep": "gutterDecoration", "name": "lineNumbers"}], "type": "supported", "name": "text_editor"}, "debugging": {"reloadURL": "/plugin/reload/debugging", "resourceURL": "/plugin/file/supported/debugging/resources/", "description": "Commands that may be useful in working on Skywriter", "tiki:resources": [{"url": "/plugin/script/supported/debugging/", "type": "script", "id": "debugging:", "name": "index"}], "dependencies": {"canon": "0.0"}, "testmodules": [], "provides": [{"description": "execute any editor action", "params": [{"type": "text", "name": "actionname", "description": ""}], "hidden": true, "pointer": "#actionCommand", "ep": "command", "name": "action"}, {"description": "A test echo command", "params": [{"type": "text", "name": "message", "description": "The text to echo to the command line"}], "hidden": true, "pointer": "#echoCommand", "ep": "command", "name": "echo"}, {"description": "insert the given text at this point.", "params": [{"type": "text", "name": "text", "description": "???"}], "hidden": true, "pointer": "#insertCommand", "ep": "command", "name": "insert"}, {"description": "Turn on and off readonly mode", "params": [{"type": "text", "name": "flag", "description": "???"}], "hidden": true, "pointer": "#readonlyCommand", "ep": "command", "name": "readonly"}, {"description": "insert templates", "params": [{"type": "text", "name": "type", "description": "pass in the template name"}], "hidden": true, "pointer": "#templateCommand", "ep": "command", "name": "template"}, {"description": "use patterns to bring in code", "params": [{"type": "text", "name": "type", "description": "\'sound\' will add sound support"}], "hidden": true, "pointer": "#useCommand", "ep": "command", "name": "use"}, {"description": "create some output, slowly, after a given time (default 5s)", "params": [{"type": "text", "name": "seconds", "description": "How long do we wait before creating output"}], "hidden": true, "pointer": "#slowCommand", "ep": "command", "name": "slow"}, {"description": "Display a list of outstanding or recently completed promises", "params": [{"type": {"data": ["outstanding", "recent"], "name": "selection"}, "name": "which", "description": "Do we display <tt>outstanding</tt> or <tt>recent</tt> promises?"}], "hidden": true, "pointer": "#promiseCommand", "ep": "command", "name": "promise"}, {"description": "Create an error", "params": [{"defaultValue": "throw", "type": {"data": ["throw", "request"], "name": "selection"}, "name": "type", "description": "Do we cause the error by throwing or using request.doneWithError()?"}, {"defaultValue": false, "type": "boolean", "name": "async", "description": "Do we become asyncronous before causing the error?"}, {"defaultValue": "Error", "type": "string", "name": "message", "description": "What message should we report?"}], "hidden": true, "pointer": "#errorCommand", "ep": "command", "name": "error"}], "type": "supported", "name": "debugging"}, "jslint_command": {"reloadURL": "/plugin/reload/jslint_command", "resourceURL": "/plugin/file/supported/jslint_command/resources/", "name": "jslint_command", "objects": [], "dependencies": {"jslint": "0.0.0", "notifier": "0.0.0"}, "testmodules": [], "tiki:resources": [{"url": "/plugin/script/supported/jslint_command/", "type": "script", "id": "jslint_command:", "name": "index"}], "provides": [{"description": "Run JSLint to check the current file", "params": [], "key": "ctrl_shift_v", "predicates": {"context": "js"}, "pointer": "#jslintCommand", "ep": "command", "name": "jslint"}, {"description": "Runs JSLint when a JavaScript file is saved", "pointer": "#jslintSaveHook", "ep": "savehook", "name": "jslint"}, {"description": "JSLint errors", "level": "error", "ep": "notification", "name": "jslint_error"}], "type": "supported", "description": "Provides the JSLint command to check code for errors."}, "file_commands": {"reloadURL": "/plugin/reload/file_commands", "resourceURL": "/plugin/file/supported/file_commands/resources/", "description": "File management commands", "tiki:resources": [{"url": "/plugin/script/supported/file_commands/index.js", "type": "script", "id": "file_commands:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/file_commands/tests/testCommands.js", "type": "script", "id": "file_commands:tests/testCommands.js", "name": "tests/testCommands.js"}, {"url": "/plugin/script/supported/file_commands/views/types.js", "type": "script", "id": "file_commands:views/types.js", "name": "views/types.js"}], "dependencies": {"text_editor": "0.0.0", "matcher": "0.0", "command_line": "0.0", "filesystem": "0.0"}, "testmodules": ["tests/testCommands"], "provides": [{"description": "Hooks to be executed on save", "ep": "extensionpoint", "name": "savehook"}, {"description": "show files", "name": "ls", "params": [{"type": "text", "name": "path", "description": "list files relative to current file, or start with /projectname"}], "pointer": "#filesCommand", "ep": "command", "aliases": ["dir", "list", "files"]}, {"description": "save the current contents", "params": [{"defaultValue": null, "type": "text", "name": "filename", "description": "add the filename to save as, or use the current file"}], "key": "ctrl_s", "pointer": "#saveCommand", "ep": "command", "name": "save"}, {"description": "save the current contents under a new name", "params": [{"defaultValue": "", "type": "text", "name": "path", "description": "the filename to save to"}], "key": "ctrl_shift_s", "pointer": "#saveAsCommand", "ep": "command", "name": "saveas"}, {"description": "load up the contents of the file", "name": "open", "params": [{"type": "existingFile", "name": "path", "description": "the filename to open"}, {"defaultValue": null, "type": "number", "name": "line", "description": "optional line to jump to"}], "key": "ctrl_o", "pointer": "#openCommand", "ep": "command", "aliases": ["load"]}, {"description": "remove the file", "name": "rm", "params": [{"type": "text", "name": "path", "description": "add the filename to remove, give a full path starting with \'/\' to delete from a different project. To delete a directory end the path in a \'/\'"}], "pointer": "#rmCommand", "ep": "command", "aliases": ["remove", "del"]}, {"description": "A method of selecting an existing file", "pointer": "views/types#existingFileHint", "ep": "typehint", "name": "existingFile"}, {"description": "Creates an empty buffer for editing a new file.", "pointer": "#newfileCommand", "ep": "command", "name": "newfile"}, {"pointer": "#mkdirCommand", "description": "create a new directory, use a leading / to create a directory in a different project", "params": [{"type": "text", "name": "path", "description": "Directory to create"}], "ep": "command", "name": "mkdir"}, {"pointer": "#cdCommand", "description": "change working directory", "params": [{"type": "text", "name": "workingDir", "description": "Directory as working directory"}], "ep": "command", "name": "cd"}, {"description": "show the current working directory", "pointer": "#pwdCommand", "ep": "command", "name": "pwd"}, {"description": "revert the current buffer to the last saved version", "pointer": "#revertCommand", "ep": "command", "name": "revert"}], "type": "supported", "name": "file_commands"}, "plugindev": {"reloadURL": "/plugin/reload/plugindev", "resourceURL": "/plugin/file/supported/plugindev/resources/", "description": "Tools for testing and managing plugins.", "tiki:resources": [{"url": "/plugin/script/supported/plugindev/commands.js", "type": "script", "id": "plugindev:commands.js", "name": "commands.js"}, {"url": "/plugin/script/supported/plugindev/debug.js", "type": "script", "id": "plugindev:debug.js", "name": "debug.js"}, {"url": "/plugin/script/supported/plugindev/index.js", "type": "script", "id": "plugindev:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/plugindev/testing.js", "type": "script", "id": "plugindev:testing.js", "name": "testing.js"}, {"url": "/plugin/script/supported/plugindev/tests/testPlugins.js", "type": "script", "id": "plugindev:tests/testPlugins.js", "name": "tests/testPlugins.js"}], "dependencies": {"skywriter_server": "0.0.0", "theme_manager_base": "0.0.0", "core_test": "0.0.0", "types": "0.0.0"}, "testmodules": ["tests/testPlugins"], "provides": [{"url": "plugindev.less", "ep": "themestyles"}, {"pointer": "#reloadCommand", "description": "Reload the named plugin.", "params": [{"type": {"pointer": "plugindev:index#getPlugins", "name": "selection"}, "name": "plugin"}], "ep": "command", "name": "plugin reload"}, {"pointer": "testing#testrunner", "description": "Run a collection of tests.", "params": [{"defaultValue": null, "type": {"pointer": "plugindev:index#getPlugins", "name": "selection"}, "name": "testmodule", "description": "Provide a plugin name to run all tests for a plugin, \'all\' to run all known tests, or plugin:module to run the tests in a specific module. If you omit this, the last tests run will be run again."}], "ep": "command", "name": "test"}, {"description": "Plugin management", "ep": "command", "name": "plugin"}, {"pointer": "commands#add", "description": "Add a file or directory in your Skywriter files as a plugin.", "params": [{"type": "text", "name": "path", "description": "Path to a file or directory."}], "ep": "command", "name": "plugin add"}, {"description": "List the installed plugins", "pointer": "commands#list", "ep": "command", "name": "plugin list"}, {"pointer": "commands#remove", "description": "Remove a plugin (deletes installed plugins, just removes the reference to \'add\'ed plugins).", "params": [{"type": {"pointer": "skywriter:plugins#getUserPlugins", "name": "selection"}, "name": "plugin"}], "ep": "command", "name": "plugin remove"}, {"pointer": "commands#install", "description": "Install a plugin from a given URL", "params": [{"type": "text", "name": "plugin", "description": "name (if in Gallery) or URL where the plugin can be found"}], "ep": "command", "name": "plugin install"}, {"pointer": "commands#upload", "description": "Upload a plugin you\'ve created to the plugin gallery.", "params": [{"type": "text", "name": "pluginName", "description": "name of the plugin to upload"}], "ep": "command", "name": "plugin upload"}, {"description": "List the plugins in the Plugin Gallery", "pointer": "commands#gallery", "ep": "command", "name": "plugin gallery"}, {"pointer": "commands#order", "description": "Set the order of plugin extensions.", "params": [{"defaultValue": null, "type": "text", "name": "order", "description": "if given, set the plugin order, otherwise show the order"}], "ep": "command", "name": "plugin order"}, {"pointer": "commands#deactivate", "description": "Deactivate plugins.", "params": [{"defaultValue": "", "type": {"pointer": "plugindev:index#getUserActivePlugins", "name": "selection"}, "name": "pluginNames", "description": "Plugins to deactivate separated by a space"}], "ep": "command", "name": "plugin deactivate"}, {"pointer": "commands#activate", "description": "Activate plugins.", "params": [{"defaultValue": "", "type": {"pointer": "plugindev:index#getUserDeactivatedPlugins", "name": "selection"}, "name": "pluginNames", "description": "Plugins to activate separated by a space"}], "ep": "command", "name": "plugin activate"}, {"pointer": "commands#info", "description": "Display detailed information for a plugin", "params": [{"type": "text", "name": "pluginName", "description": "name of the plugin for which to display info"}], "ep": "command", "name": "plugin info"}, {"pointer": "commands#ep", "description": "Display information about the extension points in this Skywriter", "params": [{"type": "text", "name": "ep", "description": "(optional) name of an extension point for which to display details"}], "ep": "command", "name": "ep"}, {"description": "Commands useful for debugging", "ep": "command", "name": "debug"}, {"description": "Displays the active contexts at the insertion point", "pointer": "debug#syntaxContexts", "ep": "command", "name": "debug syntaxcontexts"}, {"description": "a valid URL (http/https) from which to install a plugin", "pointer": "commands#pluginURL", "ep": "type", "name": "pluginURL"}], "type": "supported", "name": "plugindev"}, "diff_syntax": {"reloadURL": "/plugin/reload/diff_syntax", "resourceURL": "/plugin/file/supported/diff_syntax/resources/", "name": "diff_syntax", "tiki:resources": [{"url": "/plugin/script/supported/diff_syntax/", "type": "script", "id": "diff_syntax:", "name": "index"}], "environments": {"worker": true}, "dependencies": {"standard_syntax": "0.0.0"}, "testmodules": [], "provides": [{"pointer": "#DiffSyntax", "ep": "syntax", "fileexts": ["diff", "patch"], "name": "diff"}], "type": "supported", "description": "Diff syntax highlighter"}, "theme_manager_base": {"reloadURL": "/plugin/reload/theme_manager_base", "resourceURL": "/plugin/file/supported/theme_manager_base/resources/", "name": "theme_manager_base", "tiki:resources": [{"url": "/plugin/script/supported/theme_manager_base/", "type": "script", "id": "theme_manager_base:", "name": "index"}], "share": true, "environments": {"main": true}, "dependencies": {}, "testmodules": [], "provides": [{"description": "(Less)files holding the CSS style information for the UI.", "params": [{"required": true, "name": "url", "description": "Name of the ThemeStylesFile - can also be an array of files."}], "ep": "extensionpoint", "name": "themestyles"}, {"description": "Event: Notify when the theme(styles) changed.", "params": [{"required": true, "name": "pointer", "description": "Function that is called whenever the theme is changed."}], "ep": "extensionpoint", "name": "themeChange"}, {"indexOn": "name", "description": "A theme is a way change the look of the application.", "params": [{"required": false, "name": "url", "description": "Name of a ThemeStylesFile that holds theme specific CSS rules - can also be an array of files."}, {"required": true, "name": "pointer", "description": "Function that returns the ThemeData"}], "ep": "extensionpoint", "name": "theme"}], "type": "supported", "description": "Defines extension points required for theming"}, "canon": {"reloadURL": "/plugin/reload/canon", "resourceURL": "/plugin/file/supported/canon/resources/", "name": "canon", "tiki:resources": [{"url": "/plugin/script/supported/canon/history.js", "type": "script", "id": "canon:history.js", "name": "history.js"}, {"url": "/plugin/script/supported/canon/request.js", "type": "script", "id": "canon:request.js", "name": "request.js"}, {"url": "/plugin/script/supported/canon/tests/fixture.js", "type": "script", "id": "canon:tests/fixture.js", "name": "tests/fixture.js"}], "environments": {"main": true, "worker": false}, "dependencies": {"environment": "0.0.0", "events": "0.0.0", "settings": "0.0.0"}, "testmodules": [], "provides": [{"indexOn": "name", "description": "A command is a bit of functionality with optional typed arguments which can do something small like moving the cursor around the screen, or large like cloning a project from VCS.", "ep": "extensionpoint", "name": "command"}, {"description": "An extension point to be called whenever a new command begins output.", "ep": "extensionpoint", "name": "addedRequestOutput"}, {"description": "A dimensionsChanged is a way to be notified of changes to the dimension of Skywriter", "ep": "extensionpoint", "name": "dimensionsChanged"}, {"description": "How many typed commands do we recall for reference?", "defaultValue": 50, "type": "number", "ep": "setting", "name": "historyLength"}, {"action": "create", "pointer": "history#InMemoryHistory", "ep": "factory", "name": "history"}], "type": "supported", "description": "Manages commands"}, "screen_theme": {"reloadURL": "/plugin/reload/screen_theme", "resourceURL": "/plugin/file/supported/screen_theme/resources/", "description": "Skywriters standard theme basePlugin", "tiki:resources": [], "dependencies": {"theme_manager": "0.0.0"}, "testmodules": [], "provides": [{"url": ["theme.less"], "ep": "themestyles"}, {"defaultValue": "@global_font", "ep": "themevariable", "name": "container_font"}, {"defaultValue": "@global_font_size", "ep": "themevariable", "name": "container_font_size"}, {"defaultValue": "@global_container_background", "ep": "themevariable", "name": "container_bg"}, {"defaultValue": "@global_color", "ep": "themevariable", "name": "container_color"}, {"defaultValue": "@global_line_height", "ep": "themevariable", "name": "container_line_height"}, {"defaultValue": "@global_pane_background", "ep": "themevariable", "name": "pane_bg"}, {"defaultValue": "@global_pane_border_radius", "ep": "themevariable", "name": "pane_border_radius"}, {"defaultValue": "@global_form_font", "ep": "themevariable", "name": "form_font"}, {"defaultValue": "@global_form_font_size", "ep": "themevariable", "name": "form_font_size"}, {"defaultValue": "@global_form_line_height", "ep": "themevariable", "name": "form_line_height"}, {"defaultValue": "@global_form_color", "ep": "themevariable", "name": "form_color"}, {"defaultValue": "@global_form_text_shadow", "ep": "themevariable", "name": "form_text_shadow"}, {"defaultValue": "@global_pane_link_color", "ep": "themevariable", "name": "pane_a_color"}, {"defaultValue": "@global_font", "ep": "themevariable", "name": "pane_font"}, {"defaultValue": "@global_font_size", "ep": "themevariable", "name": "pane_font_size"}, {"defaultValue": "@global_pane_text_shadow", "ep": "themevariable", "name": "pane_text_shadow"}, {"defaultValue": "@global_pane_h1_font", "ep": "themevariable", "name": "pane_h1_font"}, {"defaultValue": "@global_pane_h1_font_size", "ep": "themevariable", "name": "pane_h1_font_size"}, {"defaultValue": "@global_pane_h1_color", "ep": "themevariable", "name": "pane_h1_color"}, {"defaultValue": "@global_font_size * 1.8", "ep": "themevariable", "name": "pane_line_height"}, {"defaultValue": "@global_pane_color", "ep": "themevariable", "name": "pane_color"}, {"defaultValue": "@global_text_shadow", "ep": "themevariable", "name": "pane_text_shadow"}, {"defaultValue": "@global_font", "ep": "themevariable", "name": "button_font"}, {"defaultValue": "@global_font_size", "ep": "themevariable", "name": "button_font_size"}, {"defaultValue": "@global_button_color", "ep": "themevariable", "name": "button_color"}, {"defaultValue": "@global_button_background", "ep": "themevariable", "name": "button_bg"}, {"defaultValue": "@button_bg - #063A27", "ep": "themevariable", "name": "button_bg2"}, {"defaultValue": "@button_bg - #194A5E", "ep": "themevariable", "name": "button_border"}, {"defaultValue": "@global_control_background", "ep": "themevariable", "name": "control_bg"}, {"defaultValue": "@global_control_color", "ep": "themevariable", "name": "control_color"}, {"defaultValue": "@global_control_border", "ep": "themevariable", "name": "control_border"}, {"defaultValue": "@global_control_border_radius", "ep": "themevariable", "name": "control_border_radius"}, {"defaultValue": "@global_control_active_background", "ep": "themevariable", "name": "control_active_bg"}, {"defaultValue": "@global_control_active_border", "ep": "themevariable", "name": "control_active_border"}, {"defaultValue": "@global_control_active_color", "ep": "themevariable", "name": "control_active_color"}, {"defaultValue": "@global_control_active_inset_color", "ep": "themevariable", "name": "control_active_inset_color"}], "type": "supported", "name": "screen_theme"}, "jlayout_grid": {"reloadURL": "/plugin/reload/jlayout_grid", "resourceURL": "/plugin/file/thirdparty/jlayout_grid/resources/", "name": "jlayout_grid", "tiki:resources": [{"url": "/plugin/script/thirdparty/jlayout_grid/", "type": "script", "id": "jlayout_grid:", "name": "index"}], "dependencies": {"jlayout": "1.0.0"}, "testmodules": [], "type": "thirdparty"}, "gritter": {"reloadURL": "/plugin/reload/gritter", "resourceURL": "/plugin/file/thirdparty/gritter/resources/", "name": "gritter", "tiki:resources": [{"url": "/plugin/script/thirdparty/gritter/index.js", "type": "script", "id": "gritter:index.js", "name": "index.js"}], "version": "1.6.0", "testmodules": [], "provides": [{"url": ["jquery.gritter.less"], "ep": "themestyles"}], "dependencies": {"jquery": "1.4.2", "theme_manager_base": "0.0.0"}, "type": "thirdparty"}, "traits": {"reloadURL": "/plugin/reload/traits", "resourceURL": "/plugin/file/thirdparty/traits/resources/", "description": "Traits library, traitsjs.org", "tiki:resources": [{"url": "/plugin/script/thirdparty/traits/", "type": "script", "id": "traits:", "name": "index"}], "dependencies": {}, "testmodules": [], "provides": [], "type": "thirdparty", "name": "traits"}, "jquery_ui_checkbox": {"reloadURL": "/plugin/reload/jquery_ui_checkbox", "resourceURL": "/plugin/file/thirdparty/jquery_ui_checkbox/resources/", "name": "jquery_ui_checkbox", "tiki:resources": [{"url": "/plugin/script/thirdparty/jquery_ui_checkbox/", "type": "script", "id": "jquery_ui_checkbox:", "name": "index"}], "version": "1.4.1", "testmodules": [], "dependencies": {"jquery_ui_widget": "1.8.0"}, "type": "thirdparty"}, "jquery_ui_widget": {"reloadURL": "/plugin/reload/jquery_ui_widget", "resourceURL": "/plugin/file/thirdparty/jquery_ui_widget/resources/", "name": "jquery_ui_widget", "tiki:resources": [{"url": "/plugin/script/thirdparty/jquery_ui_widget/", "type": "script", "id": "jquery_ui_widget:", "name": "index"}], "version": "1.8.0", "testmodules": [], "dependencies": {}, "type": "thirdparty"}, "keyboard": {"reloadURL": "/plugin/reload/keyboard", "resourceURL": "/plugin/file/supported/keyboard/resources/", "description": "Keyboard shortcuts", "tiki:resources": [{"url": "/plugin/script/supported/keyboard/keyboard.js", "type": "script", "id": "keyboard:keyboard.js", "name": "keyboard.js"}, {"url": "/plugin/script/supported/keyboard/keyutil.js", "type": "script", "id": "keyboard:keyutil.js", "name": "keyutil.js"}, {"url": "/plugin/script/supported/keyboard/tests/testKeyboard.js", "type": "script", "id": "keyboard:tests/testKeyboard.js", "name": "tests/testKeyboard.js"}], "dependencies": {"canon": "0.0", "settings": "0.0"}, "testmodules": ["tests/testKeyboard"], "provides": [{"description": "A keymapping defines how keystrokes are interpreted.", "params": [{"required": true, "name": "states", "description": "Holds the states and all the informations about the keymapping. See docs: pluginguide/keymapping"}], "ep": "extensionpoint", "name": "keymapping"}], "type": "supported", "name": "keyboard"}, "worker_manager": {"reloadURL": "/plugin/reload/worker_manager", "resourceURL": "/plugin/file/supported/worker_manager/resources/", "description": "Manages a web worker on the browser side", "tiki:resources": [{"url": "/plugin/script/supported/worker_manager/", "type": "script", "id": "worker_manager:", "name": "index"}], "dependencies": {"canon": "0.0.0", "events": "0.0.0", "underscore": "0.0.0"}, "testmodules": [], "provides": [{"description": "Low-level web worker control (for plugin development)", "ep": "command", "name": "worker"}, {"description": "Restarts all web workers (for plugin development)", "pointer": "#workerRestartCommand", "ep": "command", "name": "worker restart"}], "type": "supported", "name": "worker_manager"}, "diff": {"reloadURL": "/plugin/reload/diff", "resourceURL": "/plugin/file/thirdparty/diff/resources/", "description": "Diff/Match/Patch module (support code, no UI)", "tiki:resources": [{"url": "/plugin/script/thirdparty/diff/", "type": "script", "id": "diff:", "name": "index"}], "testmodules": [], "type": "thirdparty", "name": "diff"}, "file_history": {"reloadURL": "/plugin/reload/file_history", "resourceURL": "/plugin/file/supported/file_history/resources/", "name": "file_history", "objects": ["session"], "dependencies": {"text_editor": "0.0.0", "canon": "0.0.0"}, "testmodules": ["tests/testHistory"], "tiki:resources": [{"url": "/plugin/script/supported/file_history/index.js", "type": "script", "id": "file_history:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/file_history/tests/testHistory.js", "type": "script", "id": "file_history:tests/testHistory.js", "name": "tests/testHistory.js"}], "provides": [{"action": "new", "pointer": "#FileHistory", "ep": "factory", "name": "file_history"}, {"pointer": "#handleEditorChange", "ep": "editorChange", "match": "[buffer|scrollOffset|selection]"}, {"pointer": "#loadMostRecent", "ep": "appLaunched"}], "type": "supported", "description": "History for the last opened files"}, "edit_session": {"reloadURL": "/plugin/reload/edit_session", "resourceURL": "/plugin/file/supported/edit_session/resources/", "description": "Ties together the files being edited with the views on screen", "tiki:resources": [{"url": "/plugin/script/supported/edit_session/index.js", "type": "script", "id": "edit_session:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/edit_session/tests/testSession.js", "type": "script", "id": "edit_session:tests/testSession.js", "name": "tests/testSession.js"}], "dependencies": {"events": "0.0.0"}, "testmodules": ["tests/testSession"], "provides": [{"action": "call", "pointer": "#createSession", "ep": "factory", "name": "session"}], "type": "supported", "name": "edit_session"}, "snippets": {"reloadURL": "/plugin/reload/snippets", "resourceURL": "/plugin/file/labs/snippets/resources/", "name": "snippets", "tiki:resources": [{"url": "/plugin/script/labs/snippets/index.js", "type": "script", "id": "snippets:index.js", "name": "index.js"}], "environments": {"main": true, "worker": false}, "dependencies": {"canon": "0.0", "keyboard": "0.0"}, "testmodules": [], "provides": [{"indexOn": "name", "description": "Some boiler plate text for insertion into an file", "register": "#addSnippet", "ep": "extensionpoint", "name": "snippet"}, {"contents": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam nec adipiscing nibh. Quisque non dictum nunc. Nunc sollicitudin ornare dui, semper vehicula sapien venenatis id. Sed nec tincidunt mauris. Nunc risus est, commodo ut tempus ac, pulvinar et leo. Mauris massa risus, vestibulum sit amet viverra id, tristique sed quam. Donec sit amet lorem lacus. Aliquam eleifend odio sed enim consectetur consequat. Nullam rutrum porttitor feugiat. Nunc ultrices sapien eget velit fermentum blandit. Etiam suscipit risus vel purus tristique nec porttitor felis sollicitudin. In enim nibh, cursus ac interdum nec, adipiscing ac lorem. Vivamus sodales nunc lorem, a bibendum enim. Nullam ac erat vitae augue consectetur tincidunt. Nullam lobortis nisl nec lectus pharetra laoreet. Ut ultricies bibendum consectetur. Cras vulputate ultricies tincidunt. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec lectus magna, feugiat quis pretium sed, commodo ac enim. Nullam lobortis, ipsum porta dapibus rutrum, arcu purus semper dui, non suscipit nunc nulla non sapien", "ep": "snippet", "context": "text", "name": "lipsum"}, {"contents": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\" />\n  <link rel=\"stylesheet\" href=\"styles.css\" />\n</head>\n\n<body>\n</body>\n</html>\n", "ep": "snippet", "context": "html", "name": "html5"}, {"description": "Insert a custom snippet", "params": [{"type": {"pointer": "Snippets:index#getSnippets", "name": "selection"}, "name": "snippet", "description": "The name of the snippet to insert"}], "predicates": {"context": "html"}, "pointer": "#snippetCommand", "ep": "command", "name": "snippet"}], "type": "labs", "description": "Infrastructure and commands for inserting custom snippets"}, "syntax_manager": {"reloadURL": "/plugin/reload/syntax_manager", "resourceURL": "/plugin/file/supported/syntax_manager/resources/", "name": "syntax_manager", "tiki:resources": [{"url": "/plugin/script/supported/syntax_manager/index.js", "type": "script", "id": "syntax_manager:index.js", "name": "index.js"}], "environments": {"main": true, "worker": false}, "dependencies": {"worker_manager": "0.0.0", "events": "0.0.0", "underscore": "0.0.0", "syntax_directory": "0.0.0"}, "testmodules": [], "provides": [], "type": "supported", "description": "Provides syntax highlighting services for the editor"}, "completion": {"reloadURL": "/plugin/reload/completion", "resourceURL": "/plugin/file/supported/completion/resources/", "description": "Code completion support", "tiki:resources": [{"url": "/plugin/script/supported/completion/controller.js", "type": "script", "id": "completion:controller.js", "name": "controller.js"}, {"url": "/plugin/script/supported/completion/ui.js", "type": "script", "id": "completion:ui.js", "name": "ui.js"}, {"url": "/plugin/file/supported/completion/resources/completion.css?1285406021", "type": "stylesheet", "id": "completion:resources/completion.css", "name": "resources/completion.css"}], "dependencies": {"jquery": "0.0.0", "ctags": "0.0.0", "rangeutils": "0.0.0", "canon": "0.0.0", "underscore": "0.0.0"}, "testmodules": [], "provides": [{"indexOn": "name", "description": "Code completion support for specific languages", "ep": "extensionpoint", "name": "completion"}, {"description": "Accept the chosen completion", "key": ["return", "tab"], "predicates": {"completing": true}, "pointer": "controller#completeCommand", "ep": "command", "name": "complete"}, {"description": "Abandon the completion", "key": "escape", "predicates": {"completing": true}, "pointer": "controller#completeCancelCommand", "ep": "command", "name": "complete cancel"}, {"description": "Choose the completion below", "key": "down", "predicates": {"completing": true}, "pointer": "controller#completeDownCommand", "ep": "command", "name": "complete down"}, {"description": "Choose the completion above", "key": "up", "predicates": {"completing": true}, "pointer": "controller#completeUpCommand", "ep": "command", "name": "complete up"}], "type": "supported", "name": "completion"}, "rangeutils": {"reloadURL": "/plugin/reload/rangeutils", "resourceURL": "/plugin/file/supported/rangeutils/resources/", "description": "Utility functions for dealing with ranges of text", "tiki:resources": [{"url": "/plugin/script/supported/rangeutils/tests/test.js", "type": "script", "id": "rangeutils:tests/test.js", "name": "tests/test.js"}, {"url": "/plugin/script/supported/rangeutils/utils/range.js", "type": "script", "id": "rangeutils:utils/range.js", "name": "utils/range.js"}], "testmodules": ["tests/test"], "type": "supported", "name": "rangeutils"}, "undomanager": {"reloadURL": "/plugin/reload/undomanager", "resourceURL": "/plugin/file/supported/undomanager/resources/", "description": "Manages undoable events", "tiki:resources": [{"url": "/plugin/script/supported/undomanager/index.js", "type": "script", "id": "undomanager:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/undomanager/tests/testUndomanager.js", "type": "script", "id": "undomanager:tests/testUndomanager.js", "name": "tests/testUndomanager.js"}], "testmodules": ["tests/testUndomanager"], "provides": [{"pointer": "#undoManagerCommand", "ep": "command", "key": ["ctrl_shift_z"], "name": "redo"}, {"pointer": "#undoManagerCommand", "ep": "command", "key": ["ctrl_z"], "name": "undo"}], "type": "supported", "name": "undomanager"}, "overlay": {"reloadURL": "/plugin/reload/overlay", "resourceURL": "/plugin/file/thirdparty/overlay/resources/", "name": "overlay", "tiki:resources": [{"url": "/plugin/script/thirdparty/overlay/", "type": "script", "id": "overlay:", "name": "index"}], "version": "1.2.0", "testmodules": [], "type": "thirdparty"}, "jlayout_flexgrid": {"reloadURL": "/plugin/reload/jlayout_flexgrid", "resourceURL": "/plugin/file/thirdparty/jlayout_flexgrid/resources/", "name": "jlayout_flexgrid", "tiki:resources": [{"url": "/plugin/script/thirdparty/jlayout_flexgrid/", "type": "script", "id": "jlayout_flexgrid:", "name": "index"}], "dependencies": {"jlayout": "1.0.0"}, "testmodules": [], "type": "thirdparty"}, "less": {"reloadURL": "/plugin/reload/less", "resourceURL": "/plugin/file/thirdparty/less/resources/", "description": "Leaner CSS", "contributors": [], "author": "Alexis Sellier <self@cloudhead.net>", "url": "http://lesscss.org", "version": "1.0.11", "dependencies": {}, "testmodules": [], "tiki:resources": [{"url": "/plugin/script/thirdparty/less/", "type": "script", "id": "less:", "name": "index"}], "provides": [], "keywords": ["css", "parser", "lesscss", "browser"], "type": "thirdparty", "name": "less"}, "command_line": {"reloadURL": "/plugin/reload/command_line", "resourceURL": "/plugin/file/supported/command_line/resources/", "description": "Provides the command line user interface", "tiki:resources": [{"url": "/plugin/templates/command_line/", "type": "script", "id": "command_line:templates", "name": "templates"}, {"url": "/plugin/script/supported/command_line/commands/basic.js", "type": "script", "id": "command_line:commands/basic.js", "name": "commands/basic.js"}, {"url": "/plugin/script/supported/command_line/commands/history.js", "type": "script", "id": "command_line:commands/history.js", "name": "commands/history.js"}, {"url": "/plugin/script/supported/command_line/commands/simple.js", "type": "script", "id": "command_line:commands/simple.js", "name": "commands/simple.js"}, {"url": "/plugin/script/supported/command_line/hint.js", "type": "script", "id": "command_line:hint.js", "name": "hint.js"}, {"url": "/plugin/script/supported/command_line/input.js", "type": "script", "id": "command_line:input.js", "name": "input.js"}, {"url": "/plugin/script/supported/command_line/tests/testInput.js", "type": "script", "id": "command_line:tests/testInput.js", "name": "tests/testInput.js"}, {"url": "/plugin/script/supported/command_line/typehint.js", "type": "script", "id": "command_line:typehint.js", "name": "typehint.js"}, {"url": "/plugin/script/supported/command_line/views/basic.js", "type": "script", "id": "command_line:views/basic.js", "name": "views/basic.js"}, {"url": "/plugin/script/supported/command_line/views/cli.js", "type": "script", "id": "command_line:views/cli.js", "name": "views/cli.js"}, {"url": "/plugin/script/supported/command_line/views/menu.js", "type": "script", "id": "command_line:views/menu.js", "name": "views/menu.js"}, {"url": "/plugin/script/supported/command_line/views/requestOutput.js", "type": "script", "id": "command_line:views/requestOutput.js", "name": "views/requestOutput.js"}], "dependencies": {"templater": "0.0.0", "settings": "0.0.0", "matcher": "0.0.0", "theme_manager_base": "0.0.0", "canon": "0.0.0", "keyboard": "0.0.0", "diff": "0.0.0", "types": "0.0.0"}, "testmodules": ["tests/testInput"], "provides": [{"url": ["article.less", "cli.less", "menu.less", "requestOutput.less", "global.less"], "ep": "themestyles"}, {"defaultValue": "@global_container_background", "ep": "themevariable", "name": "bg"}, {"defaultValue": "@global_container_background + #090807", "ep": "themevariable", "name": "input_bg_light"}, {"defaultValue": "@global_container_background - #030303", "ep": "themevariable", "name": "input_bg"}, {"defaultValue": "@global_container_background - #050506", "ep": "themevariable", "name": "input_bg2"}, {"defaultValue": "@global_menu_inset_color_top_left", "ep": "themevariable", "name": "border_fg"}, {"defaultValue": "@global_menu_inset_color_right", "ep": "themevariable", "name": "border_fg2"}, {"defaultValue": "@global_menu_background", "ep": "themevariable", "name": "menu_bg"}, {"defaultValue": "@global_menu_border_color", "ep": "themevariable", "name": "border_bg"}, {"defaultValue": "@global_color", "ep": "themevariable", "name": "text"}, {"defaultValue": "@global_header_color", "ep": "themevariable", "name": "hi_text"}, {"defaultValue": "@global_hint_color", "ep": "themevariable", "name": "lo_text"}, {"defaultValue": "@global_hint_color", "ep": "themevariable", "name": "lo_text2"}, {"defaultValue": "@global_link_color", "ep": "themevariable", "name": "link_text"}, {"defaultValue": "@global_error_color", "ep": "themevariable", "name": "error_text"}, {"defaultValue": "@global_selectable_hover_background", "ep": "themevariable", "name": "theme_text"}, {"comment": "#FFCE00", "defaultValue": "rgb(255,206,0)", "ep": "themevariable", "name": "theme_text_light"}, {"defaultValue": "@global_selectable_hover_background - #222000", "ep": "themevariable", "name": "theme_text_dark"}, {"defaultValue": "@global_accelerator_color", "ep": "themevariable", "name": "theme_text_dark2"}, {"comment": "#0E0906", "defaultValue": "rgb(14,9,6)", "ep": "themevariable", "name": "input_submenu"}, {"defaultValue": "@global_font", "ep": "themevariable", "name": "fonts"}, {"defaultValue": "@global_selectable_hover_color", "ep": "themevariable", "name": "li_hover_color"}, {"defaultValue": "@global_hint_hover_color", "ep": "themevariable", "name": "li_hint_hover_color"}, {"defaultValue": "@global_accelerator_hover_color", "ep": "themevariable", "name": "li_accelerator_hover_color"}, {"action": "new", "pointer": "views/cli#CliInputView", "ep": "factory", "name": "commandLine"}, {"description": "Display number|date|none next to each historical instruction", "defaultValue": "none", "type": {"data": ["number", "date", "none"], "name": "selection"}, "ep": "setting", "name": "historyTimeMode"}, {"description": "The maximum size (in pixels) for the command line output area", "defaultValue": 0, "type": "number", "ep": "setting", "name": "minConsoleHeight"}, {"description": "The minimum size (in pixels) for the command line output area", "defaultValue": 300, "type": "number", "ep": "setting", "name": "maxConsoleHeight"}, {"predicates": {"isKeyUp": false, "isCommandLine": true}, "pointer": "commands/simple#completeCommand", "ep": "command", "key": "tab", "name": "complete"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_1", "name": "menu1"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_2", "name": "menu2"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_1", "name": "menu1"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_3", "name": "menu3"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_4", "name": "menu4"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_5", "name": "menu5"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_6", "name": "menu6"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_7", "name": "menu7"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_8", "name": "menu8"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_9", "name": "menu9"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "views/menu#activateItemAction", "ep": "command", "key": "alt_0", "name": "menu0"}, {"pointer": "commands/simple#helpCommand", "description": "Get help on the available commands.", "params": [{"defaultValue": null, "type": "text", "name": "search", "description": "Search string to narrow the output."}], "ep": "command", "name": "help"}, {"pointer": "commands/simple#aliasCommand", "description": "define and show aliases for commands", "params": [{"defaultValue": null, "type": "text", "name": "alias", "description": "optionally, your alias name"}, {"defaultValue": null, "type": "text", "name": "command", "description": "optionally, the command name"}], "ep": "command", "name": "alias"}, {"description": "evals given js code and show the result", "params": [{"type": "text", "name": "javascript", "description": "The JavaScript to evaluate"}], "hidden": true, "pointer": "commands/basic#evalCommand", "ep": "command", "name": "eval"}, {"description": "show the Skywriter version", "hidden": true, "pointer": "commands/basic#versionCommand", "ep": "command", "name": "version"}, {"description": "has", "hidden": true, "pointer": "commands/basic#skywriterCommand", "ep": "command", "name": "skywriter"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "commands/history#historyPreviousCommand", "ep": "command", "key": "up", "name": "historyPrevious"}, {"predicates": {"isKeyUp": true, "isCommandLine": true}, "pointer": "commands/history#historyNextCommand", "ep": "command", "key": "down", "name": "historyNext"}, {"params": [], "description": "Show history of the commands", "pointer": "commands/history#historyCommand", "ep": "command", "name": "history"}, {"pointer": "commands/history#addedRequestOutput", "ep": "addedRequestOutput"}, {"indexOn": "name", "description": "A function to allow the command line to show a hint to the user on how they should finish what they\'re typing", "ep": "extensionpoint", "name": "typehint"}, {"description": "A UI for string that is constrained to be one of a number of pre-defined values", "pointer": "views/basic#selection", "ep": "typehint", "name": "selection"}, {"description": "A UI for a boolean", "pointer": "views/basic#bool", "ep": "typehint", "name": "boolean"}], "type": "supported", "name": "command_line"}, "editing_commands": {"reloadURL": "/plugin/reload/editing_commands", "resourceURL": "/plugin/file/supported/editing_commands/resources/", "description": "Provides higher level commands for working with the text.", "tiki:resources": [{"url": "/plugin/script/supported/editing_commands/", "type": "script", "id": "editing_commands:", "name": "index"}], "objects": ["commandLine"], "testmodules": [], "provides": [{"description": "Search for text within this buffer", "params": [{"type": "text", "name": "value", "description": "string to search for"}], "key": "ctrl_f", "pointer": "#findCommand", "ep": "command", "name": "find"}, {"description": "move it! make the editor head to a line number.", "params": [{"type": "text", "name": "line", "description": "add the line number to move to in the file"}], "key": "ctrl_l", "pointer": "#gotoCommand", "ep": "command", "name": "goto"}], "type": "supported", "name": "editing_commands"}, "syntax_directory": {"reloadURL": "/plugin/reload/syntax_directory", "resourceURL": "/plugin/file/supported/syntax_directory/resources/", "name": "syntax_directory", "tiki:resources": [{"url": "/plugin/script/supported/syntax_directory/", "type": "script", "id": "syntax_directory:", "name": "index"}], "environments": {"main": true, "worker": true}, "dependencies": {}, "testmodules": [], "provides": [{"register": "#discoveredNewSyntax", "ep": "extensionhandler", "name": "syntax"}], "type": "supported", "description": "Catalogs the available syntax engines"}, "environment": {"reloadURL": "/plugin/reload/environment", "resourceURL": "/plugin/file/supported/environment/resources/", "name": "environment", "tiki:resources": [{"url": "/plugin/script/supported/environment/", "type": "script", "id": "environment:", "name": "index"}], "dependencies": {"settings": "0.0.0"}, "testmodules": [], "type": "supported"}, "stylesheet": {"reloadURL": "/plugin/reload/stylesheet", "resourceURL": "/plugin/file/supported/stylesheet/resources/", "name": "stylesheet", "tiki:resources": [{"url": "/plugin/script/supported/stylesheet/", "type": "script", "id": "stylesheet:", "name": "index"}], "environments": {"worker": true}, "dependencies": {"standard_syntax": "0.0.0"}, "testmodules": [], "provides": [{"pointer": "#CSSSyntax", "ep": "syntax", "fileexts": ["css", "less"], "name": "css"}], "type": "supported", "description": "CSS syntax highlighter"}, "html": {"reloadURL": "/plugin/reload/html", "resourceURL": "/plugin/file/supported/html/resources/", "name": "html", "tiki:resources": [{"url": "/plugin/script/supported/html/", "type": "script", "id": "html:", "name": "index"}], "environments": {"worker": true}, "dependencies": {"standard_syntax": "0.0.0"}, "testmodules": [], "provides": [{"pointer": "#HTMLSyntax", "ep": "syntax", "fileexts": ["htm", "html"], "name": "html"}], "type": "supported", "description": "HTML syntax highlighter"}, "types": {"reloadURL": "/plugin/reload/types", "resourceURL": "/plugin/file/supported/types/resources/", "description": "Defines parameter types for commands", "tiki:resources": [{"url": "/plugin/script/supported/types/basic.js", "type": "script", "id": "types:basic.js", "name": "basic.js"}, {"url": "/plugin/script/supported/types/tests/testBasic.js", "type": "script", "id": "types:tests/testBasic.js", "name": "tests/testBasic.js"}, {"url": "/plugin/script/supported/types/tests/testTypes.js", "type": "script", "id": "types:tests/testTypes.js", "name": "tests/testTypes.js"}, {"url": "/plugin/script/supported/types/types.js", "type": "script", "id": "types:types.js", "name": "types.js"}], "testmodules": ["tests/testBasic", "tests/testTypes"], "provides": [{"indexOn": "name", "description": "Commands can accept various arguments that the user enters or that are automatically supplied by the environment. Those arguments have types that define how they are supplied or completed. The pointer points to an object with methods convert(str value) and getDefault(). Both functions have `this` set to the command\'s `takes` parameter. If getDefault is not defined, the default on the command\'s `takes` is used, if there is one. The object can have a noInput property that is set to true to reflect that this type is provided directly by the system. getDefault must be defined in that case.", "ep": "extensionpoint", "name": "type"}, {"description": "Text that the user needs to enter.", "pointer": "basic#text", "ep": "type", "name": "text"}, {"description": "A JavaScript number", "pointer": "basic#number", "ep": "type", "name": "number"}, {"description": "A true/false value", "pointer": "basic#bool", "ep": "type", "name": "boolean"}, {"description": "An object that converts via JavaScript", "pointer": "basic#object", "ep": "type", "name": "object"}, {"description": "A string that is constrained to be one of a number of pre-defined values", "pointer": "basic#selection", "ep": "type", "name": "selection"}, {"description": "A type which we don\'t understand from the outset, but which we hope context can help us with", "ep": "type", "name": "deferred"}], "type": "supported", "name": "types"}, "js_syntax": {"reloadURL": "/plugin/reload/js_syntax", "resourceURL": "/plugin/file/supported/js_syntax/resources/", "name": "js_syntax", "tiki:resources": [{"url": "/plugin/script/supported/js_syntax/", "type": "script", "id": "js_syntax:", "name": "index"}], "environments": {"worker": true}, "dependencies": {"standard_syntax": "0.0.0"}, "testmodules": [], "provides": [{"pointer": "#JSSyntax", "ep": "syntax", "fileexts": ["js", "json"], "name": "js"}], "type": "supported", "description": "JavaScript syntax highlighter"}, "gritter_notify": {"reloadURL": "/plugin/reload/gritter_notify", "resourceURL": "/plugin/file/supported/gritter_notify/resources/", "name": "gritter_notify", "tiki:resources": [{"url": "/plugin/script/supported/gritter_notify/", "type": "script", "id": "gritter_notify:", "name": "index"}], "dependencies": {"gritter": "0.0.0"}, "testmodules": [], "provides": [{"description": "Produces Growl-like notifications using the jQuery Gritter plugin.", "level": "info", "pointer": "#gritter", "ep": "notificationHandler", "name": "gritter"}], "type": "supported"}, "toolbox_expose": {"reloadURL": "/plugin/reload/toolbox_expose", "resourceURL": "/plugin/file/thirdparty/toolbox_expose/resources/", "name": "toolbox_expose", "tiki:resources": [{"url": "/plugin/script/thirdparty/toolbox_expose/", "type": "script", "id": "toolbox_expose:", "name": "index"}], "testmodules": [], "type": "thirdparty"}, "events": {"reloadURL": "/plugin/reload/events", "resourceURL": "/plugin/file/supported/events/resources/", "description": "Dead simple event implementation", "tiki:resources": [{"url": "/plugin/script/supported/events/index.js", "type": "script", "id": "events:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/events/tests/test.js", "type": "script", "id": "events:tests/test.js", "name": "tests/test.js"}], "dependencies": {"traits": "0.0"}, "testmodules": ["tests/test"], "provides": [], "type": "supported", "name": "events"}, "templater": {"reloadURL": "/plugin/reload/templater", "resourceURL": "/plugin/file/supported/templater/resources/", "name": "templater", "tiki:resources": [{"url": "/plugin/script/supported/templater/", "type": "script", "id": "templater:", "name": "index"}], "testmodules": [], "type": "supported"}, "jlayout_border": {"reloadURL": "/plugin/reload/jlayout_border", "resourceURL": "/plugin/file/thirdparty/jlayout_border/resources/", "name": "jlayout_border", "tiki:resources": [{"url": "/plugin/script/thirdparty/jlayout_border/", "type": "script", "id": "jlayout_border:", "name": "index"}], "dependencies": {"jlayout": "1.0.0"}, "testmodules": [], "type": "thirdparty"}, "userident": {"reloadURL": "/plugin/reload/userident", "resourceURL": "/plugin/file/supported/userident/resources/", "name": "userident", "objects": ["notifier"], "share": true, "dependencies": {"jquery": "0.0.0", "templater": "0.0.0", "theme_manager_base": "0.0.0", "overlay": "1.2.0", "settings": "0.0", "jquery_ui_checkbox": "1.4.1", "toolbox_expose": "1.2.0", "events": "0.0", "skywriter_server": "0.0"}, "testmodules": [], "tiki:resources": [{"url": "/plugin/templates/userident/", "type": "script", "id": "userident:templates", "name": "templates"}, {"url": "/plugin/script/supported/userident/index.js", "type": "script", "id": "userident:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/userident/kc.js", "type": "script", "id": "userident:kc.js", "name": "kc.js"}], "provides": [{"action": "new", "pointer": "#loginController", "ep": "factory", "name": "loginController"}, {"url": "styles.less", "ep": "themestyles"}, {"description": "Logout of Skywriter", "pointer": "#logout", "ep": "command", "name": "logout"}, {"description": "Manages your Skywriter keychain, which stores remote authentication information.", "ep": "command", "name": "keychain"}, {"description": "retrieve your SSH public key used for remote server auth", "pointer": "kc#getkey", "ep": "command", "name": "keychain getkey"}, {"description": "forget the keychain password that is temporarily saved in your browser", "pointer": "kc#forget", "ep": "command", "name": "keychain forget"}, {"description": "Problems logging in to Skywriter", "level": "error", "ep": "notification", "name": "loginerror"}, {"description": "Password Reset", "level": "info", "ep": "notification", "name": "reset"}], "type": "supported", "description": "Identifies the user via a Skywriter server"}, "jquery_sizes": {"reloadURL": "/plugin/reload/jquery_sizes", "resourceURL": "/plugin/file/thirdparty/jquery_sizes/resources/", "name": "jquery_sizes", "tiki:resources": [{"url": "/plugin/script/thirdparty/jquery_sizes/", "type": "script", "id": "jquery_sizes:", "name": "index"}], "version": "0.3.3", "testmodules": [], "type": "thirdparty"}, "matcher": {"reloadURL": "/plugin/reload/matcher", "resourceURL": "/plugin/file/supported/matcher/resources/", "description": "Provides various routines to match items in a list", "tiki:resources": [{"url": "/plugin/script/supported/matcher/index.js", "type": "script", "id": "matcher:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/matcher/prefix.js", "type": "script", "id": "matcher:prefix.js", "name": "prefix.js"}, {"url": "/plugin/script/supported/matcher/quick.js", "type": "script", "id": "matcher:quick.js", "name": "quick.js"}, {"url": "/plugin/script/supported/matcher/tests/testIndex.js", "type": "script", "id": "matcher:tests/testIndex.js", "name": "tests/testIndex.js"}, {"url": "/plugin/script/supported/matcher/tests/testPrefix.js", "type": "script", "id": "matcher:tests/testPrefix.js", "name": "tests/testPrefix.js"}, {"url": "/plugin/script/supported/matcher/tests/testQuick.js", "type": "script", "id": "matcher:tests/testQuick.js", "name": "tests/testQuick.js"}], "dependencies": {}, "testmodules": ["tests/testIndex", "tests/testPrefix", "tests/testQuick"], "type": "supported", "name": "matcher"}, "mozilla": {"reloadURL": "/plugin/reload/mozilla", "resourceURL": "/plugin/file/supported/mozilla/resources/", "name": "mozilla", "tiki:resources": [{"url": "/plugin/script/supported/mozilla/", "type": "script", "id": "mozilla:", "name": "index"}], "testmodules": [], "provides": [{"description": "Let us know how we can make Skywriter better.", "pointer": "#feedbackCommand", "ep": "command", "name": "feedback"}], "type": "supported"}, "collab": {"reloadURL": "/plugin/reload/collab", "resourceURL": "/plugin/file/labs/collab/resources/", "description": "Provides collaboration options: social subsystem and mobwrite", "tiki:resources": [{"url": "/plugin/templates/collab/", "type": "script", "id": "collab:templates", "name": "templates"}, {"url": "/plugin/script/labs/collab/index.js", "type": "script", "id": "collab:index.js", "name": "index.js"}, {"url": "/plugin/script/labs/collab/mobwrite/core.js", "type": "script", "id": "collab:mobwrite/core.js", "name": "mobwrite/core.js"}, {"url": "/plugin/script/labs/collab/social.js", "type": "script", "id": "collab:social.js", "name": "social.js"}, {"url": "/plugin/script/labs/collab/user.js", "type": "script", "id": "collab:user.js", "name": "user.js"}, {"url": "/plugin/script/labs/collab/util.js", "type": "script", "id": "collab:util.js", "name": "util.js"}, {"url": "/plugin/script/labs/collab/view.js", "type": "script", "id": "collab:view.js", "name": "view.js"}, {"url": "/plugin/file/labs/collab/resources/social.css?1285406022", "type": "stylesheet", "id": "collab:resources/social.css", "name": "resources/social.css"}], "dependencies": {"text_editor": "0.0.0", "project": "0.0.0", "command_line": "0.0.0", "environment": "0.0.0", "diff": "0.0.0", "skywriter_server": "0.0.0"}, "testmodules": [], "provides": [{"pointer": "#onAppLaunched", "ep": "appLaunched"}, {"pointer": "#mobwriteFileChanged", "ep": "editorChange", "match": "[buffer]"}, {"pointer": "#mobwriteMsg", "ep": "msgtargetid", "name": "mobwrite"}, {"pointer": "view#broadcastMsg", "ep": "msgtargetid", "name": "broadcast"}, {"pointer": "view#tellMsg", "ep": "msgtargetid", "name": "tell"}, {"pointer": "view#shareTellMsg", "ep": "msgtargetid", "name": "share_tell"}, {"pointer": "view#fileEventMsg", "ep": "msgtargetid", "name": "file_event"}, {"pointer": "mobwrite/core#mobwrite", "ep": "mobwriteinstance"}, {"description": "Broadcast message from a person you follow", "level": "info", "ep": "notification", "name": "broadcast"}, {"description": "Direct message from a person you follow", "level": "info", "ep": "notification", "name": "tell"}, {"description": "Direct message from a person you follow", "level": "info", "ep": "notification", "name": "shareTell"}, {"description": "Shared file is opened by others", "level": "info", "ep": "notification", "name": "fileEvent"}, {"pointer": "social#followCommand", "description": "add to (or list) the users we are following", "params": [{"defaultValue": null, "type": "text", "name": "usernames", "description": "username(s) of person(s) to follow"}], "ep": "command", "name": "follow"}, {"pointer": "social#unfollowCommand", "description": "remove from the list of users we are following", "params": [{"type": "text", "name": "usernames", "description": "username(s) of person(s) to stop following"}], "ep": "command", "name": "unfollow"}, {"pointer": "social#broadcastCommand", "description": "send a message to all followers", "params": [{"defaultValue": null, "type": "text", "name": "message", "description": "text message to send to your followers"}], "ep": "command", "name": "broadcast"}, {"pointer": "social#tellCommand", "description": "send a message to all followers", "params": [{"type": "text", "name": "username", "description": "username of follower to send a message to"}, {"defaultValue": null, "type": "text", "name": "message", "description": "text message to send to your follower"}], "ep": "command", "name": "tell"}, {"description": "Collect the people you follow into groups, and display the existing groups", "ep": "command", "name": "group"}, {"pointer": "social#groupListCommand", "description": "List the current groups and group members", "params": [{"defaultValue": null, "type": "text", "name": "group", "description": "An optional group name or leave blank to list groups"}], "ep": "command", "name": "group list"}, {"pointer": "social#groupAddCommand", "description": "Add members to a new or existing group", "params": [{"type": "text", "name": "group", "description": "The name of the group to add to"}, {"type": "text", "name": "members", "description": "The usernames of the followers to add"}], "ep": "command", "name": "group add"}, {"pointer": "social#groupRemoveCommand", "description": "Remove members from an existing group (and remove group if empty)", "params": [{"type": "text", "name": "group", "description": "The name of the group to remove from"}, {"type": "text", "name": "members", "description": "The usernames of the followers to remove"}], "ep": "command", "name": "group remove"}, {"description": "Manage the projects that you share to other users", "ep": "command", "name": "share"}, {"pointer": "social#shareListCommand", "description": "List the current shared projects", "params": [{"defaultValue": null, "type": "text", "name": "project", "description": "An optional project name or leave blank to list shared projects"}], "ep": "command", "name": "share list"}, {"pointer": "social#shareRemoveCommand", "description": "Remove a share from the current shared projects", "params": [{"type": "text", "name": "project", "description": "The name of an existing project"}, {"defaultValue": null, "type": "text", "name": "member", "description": "Optional user or group (or leave blank for all users and groups)"}], "ep": "command", "name": "share remove"}, {"pointer": "social#shareAddCommand", "description": "Add a share to the current shared projects", "params": [{"type": "text", "name": "project", "description": "Project name to alter sharing on"}, {"type": "text", "name": "member", "description": "username or group name to change"}, {"defaultValue": null, "type": "text", "name": "permission", "description": "Permission flags. edit|readonly"}], "ep": "command", "name": "share add"}, {"pointer": "social#viewmeCommand", "description": "List and alter user\'s ability to see what I\'m working on", "params": [{"defaultValue": null, "type": "text", "name": "varargs", "description": "Arguments: ({user}|{group}|everyone) (true|false|default)"}], "ep": "command", "name": "viewme"}], "type": "labs", "name": "collab"}, "jslint": {"reloadURL": "/plugin/reload/jslint", "resourceURL": "/plugin/file/thirdparty/jslint/resources/", "description": "JSLint support code", "tiki:resources": [{"url": "/plugin/script/thirdparty/jslint/", "type": "script", "id": "jslint:", "name": "index"}], "testmodules": [], "type": "thirdparty", "name": "jslint"}, "theme_manager": {"reloadURL": "/plugin/reload/theme_manager", "resourceURL": "/plugin/file/supported/theme_manager/resources/", "name": "theme_manager", "tiki:resources": [{"url": "/plugin/script/supported/theme_manager/index.js", "type": "script", "id": "theme_manager:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/theme_manager/themestyles.js", "type": "script", "id": "theme_manager:themestyles.js", "name": "themestyles.js"}], "share": true, "environments": {"main": true, "worker": false}, "dependencies": {"theme_manager_base": "0.0.0", "settings": "0.0.0", "events": "0.0.0", "less": "0.0.0"}, "testmodules": [], "provides": [{"unregister": "themestyles#unregisterThemeStyles", "register": "themestyles#registerThemeStyles", "ep": "extensionhandler", "name": "themestyles"}, {"unregister": "index#unregisterTheme", "register": "index#registerTheme", "ep": "extensionhandler", "name": "theme"}, {"defaultValue": "standard", "description": "The theme plugin\'s name to use. If set to \'standard\' no theme will be used", "type": "text", "ep": "setting", "name": "theme"}, {"pointer": "#appLaunched", "ep": "appLaunched"}], "type": "supported", "description": "Handles colors in Skywriter"}, "underscore": {"reloadURL": "/plugin/reload/underscore", "resourceURL": "/plugin/file/thirdparty/underscore/resources/", "description": "Functional Programming Aid for Javascript. Works well with jQuery.", "tiki:resources": [{"url": "/plugin/script/thirdparty/underscore/", "type": "script", "id": "underscore:", "name": "index"}], "testmodules": [], "type": "thirdparty", "name": "underscore"}, "ctags": {"reloadURL": "/plugin/reload/ctags", "resourceURL": "/plugin/file/supported/ctags/resources/", "description": "Reads and writes tag files", "tiki:resources": [{"url": "/plugin/script/supported/ctags/index.js", "type": "script", "id": "ctags:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/ctags/reader.js", "type": "script", "id": "ctags:reader.js", "name": "reader.js"}], "dependencies": {"traits": "0.0.0", "underscore": "0.0.0"}, "testmodules": [], "type": "supported", "name": "ctags"}, "whitetheme": {"reloadURL": "/plugin/reload/whitetheme", "resourceURL": "/plugin/file/supported/whitetheme/resources/", "description": "Provides a white theme for Skywriter", "tiki:resources": [{"url": "/plugin/script/supported/whitetheme/index.js", "type": "script", "id": "whitetheme:index.js", "name": "index.js"}], "dependencies": {"theme_manager": "0.0.0"}, "testmodules": [], "provides": [{"url": ["theme.less"], "description": "A basic white theme", "pointer": "index#whiteTheme", "ep": "theme", "name": "white"}], "type": "supported", "name": "whitetheme"}, "jlayout_flow": {"reloadURL": "/plugin/reload/jlayout_flow", "resourceURL": "/plugin/file/thirdparty/jlayout_flow/resources/", "name": "jlayout_flow", "tiki:resources": [{"url": "/plugin/script/thirdparty/jlayout_flow/", "type": "script", "id": "jlayout_flow:", "name": "index"}], "dependencies": {"jlayout": "1.0.0"}, "testmodules": [], "type": "thirdparty"}, "standard_syntax": {"reloadURL": "/plugin/reload/standard_syntax", "resourceURL": "/plugin/file/supported/standard_syntax/resources/", "description": "Easy-to-use basis for syntax engines", "tiki:resources": [{"url": "/plugin/script/supported/standard_syntax/", "type": "script", "id": "standard_syntax:", "name": "index"}], "environments": {"worker": true}, "dependencies": {"syntax_worker": "0.0.0", "syntax_directory": "0.0.0", "underscore": "0.0.0"}, "testmodules": [], "type": "supported", "name": "standard_syntax"}, "toolbar": {"reloadURL": "/plugin/reload/toolbar", "resourceURL": "/plugin/file/supported/toolbar/resources/", "description": "The standard Skywriter toolbar", "tiki:resources": [{"url": "/plugin/script/supported/toolbar/index.js", "type": "script", "id": "toolbar:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/toolbar/items.js", "type": "script", "id": "toolbar:items.js", "name": "items.js"}], "dependencies": {"events": "0.0.0"}, "testmodules": [], "provides": [{"description": "Toolbar item views", "register": "index#discoveredNewToolbarItem", "params": [{"type": "string", "name": "name", "description": "name of this toolbar item"}, {"name": "pointer", "description": "pointer to a component that can be instantiated with new and has an element defined on it."}], "ep": "extensionpoint", "name": "toolbaritem"}, {"url": ["toolbar.less"], "ep": "themestyles"}, {"action": "new", "pointer": "index#ToolbarView", "ep": "factory", "name": "toolbar"}, {"pointer": "items#Logo", "ep": "toolbaritem", "name": "logo"}, {"pointer": "items#OpenFileIndicator", "ep": "toolbaritem", "name": "openfileindicator"}, {"pointer": "items#Save", "ep": "toolbaritem", "name": "save"}, {"pointer": "items#PositionIndicator", "ep": "toolbaritem", "name": "positionindicator"}], "type": "supported", "name": "toolbar"}, "jlayout": {"reloadURL": "/plugin/reload/jlayout", "resourceURL": "/plugin/file/thirdparty/jlayout/resources/", "name": "jlayout", "tiki:resources": [{"url": "/plugin/script/thirdparty/jlayout/", "type": "script", "id": "jlayout:", "name": "index"}], "dependencies": {"jquery_sizes": "0.3.3"}, "testmodules": [], "type": "thirdparty"}, "jquery": {"reloadURL": "/plugin/reload/jquery", "resourceURL": "/plugin/file/thirdparty/jquery/resources/", "name": "jquery", "tiki:resources": [{"url": "/plugin/script/thirdparty/jquery/", "type": "script", "id": "jquery:", "name": "index"}], "testmodules": [], "type": "thirdparty"}, "core_test": {"reloadURL": "/plugin/reload/core_test", "resourceURL": "/plugin/file/thirdparty/core_test/resources/", "name": "core_test", "tiki:resources": [{"url": "/plugin/script/thirdparty/core_test/assert.js", "type": "script", "id": "core_test:assert.js", "name": "assert.js"}, {"url": "/plugin/script/thirdparty/core_test/core.js", "type": "script", "id": "core_test:core.js", "name": "core.js"}, {"url": "/plugin/script/thirdparty/core_test/index.js", "type": "script", "id": "core_test:index.js", "name": "index.js"}, {"url": "/plugin/script/thirdparty/core_test/loggers/default.js", "type": "script", "id": "core_test:loggers/default.js", "name": "loggers/default.js"}, {"url": "/plugin/script/thirdparty/core_test/loggers/dummy.js", "type": "script", "id": "core_test:loggers/dummy.js", "name": "loggers/dummy.js"}, {"url": "/plugin/script/thirdparty/core_test/qunit.js", "type": "script", "id": "core_test:qunit.js", "name": "qunit.js"}, {"url": "/plugin/script/thirdparty/core_test/spec.js", "type": "script", "id": "core_test:spec.js", "name": "spec.js"}, {"url": "/plugin/script/thirdparty/core_test/system/dump.js", "type": "script", "id": "core_test:system/dump.js", "name": "system/dump.js"}, {"url": "/plugin/script/thirdparty/core_test/system/equiv.js", "type": "script", "id": "core_test:system/equiv.js", "name": "system/equiv.js"}, {"url": "/plugin/script/thirdparty/core_test/system/ext.js", "type": "script", "id": "core_test:system/ext.js", "name": "system/ext.js"}, {"url": "/plugin/script/thirdparty/core_test/system/module.js", "type": "script", "id": "core_test:system/module.js", "name": "system/module.js"}, {"url": "/plugin/script/thirdparty/core_test/system/plan.js", "type": "script", "id": "core_test:system/plan.js", "name": "system/plan.js"}, {"url": "/plugin/script/thirdparty/core_test/system/stub.js", "type": "script", "id": "core_test:system/stub.js", "name": "system/stub.js"}, {"url": "/plugin/script/thirdparty/core_test/system/suite.js", "type": "script", "id": "core_test:system/suite.js", "name": "system/suite.js"}, {"url": "/plugin/script/thirdparty/core_test/system/test.js", "type": "script", "id": "core_test:system/test.js", "name": "system/test.js"}, {"url": "/plugin/script/thirdparty/core_test/test.js", "type": "script", "id": "core_test:test.js", "name": "test.js"}, {"url": "/plugin/script/thirdparty/core_test/utils.js", "type": "script", "id": "core_test:utils.js", "name": "utils.js"}, {"url": "/plugin/file/thirdparty/core_test/resources/additions.css?1285406022", "type": "stylesheet", "id": "core_test:resources/additions.css", "name": "resources/additions.css"}, {"url": "/plugin/file/thirdparty/core_test/resources/runner.css?1285406022", "type": "stylesheet", "id": "core_test:resources/runner.css", "name": "resources/runner.css"}], "testmodules": [], "type": "thirdparty"}, "embedded": {"reloadURL": "/plugin/reload/embedded", "resourceURL": "/plugin/file/supported/embedded/resources/", "name": "embedded", "tiki:resources": [{"url": "/plugin/script/supported/embedded/", "type": "script", "id": "embedded:", "name": "index"}], "dependencies": {"theme_manager": "0.0.0", "text_editor": "0.0.0", "appconfig": "0.0.0", "edit_session": "0.0.0", "screen_theme": "0.0.0"}, "testmodules": [], "type": "supported"}, "settings": {"reloadURL": "/plugin/reload/settings", "resourceURL": "/plugin/file/supported/settings/resources/", "description": "Infrastructure and commands for managing user preferences", "tiki:resources": [{"url": "/plugin/script/supported/settings/commands.js", "type": "script", "id": "settings:commands.js", "name": "commands.js"}, {"url": "/plugin/script/supported/settings/cookie.js", "type": "script", "id": "settings:cookie.js", "name": "cookie.js"}, {"url": "/plugin/script/supported/settings/index.js", "type": "script", "id": "settings:index.js", "name": "index.js"}], "share": true, "dependencies": {"types": "0.0"}, "testmodules": [], "provides": [{"indexOn": "name", "description": "A setting is something that the application offers as a way to customize how it works", "register": "index#addSetting", "ep": "extensionpoint", "name": "setting"}, {"description": "A settingChange is a way to be notified of changes to a setting", "ep": "extensionpoint", "name": "settingChange"}, {"pointer": "commands#setCommand", "description": "define and show settings", "params": [{"defaultValue": null, "type": {"pointer": "settings:index#getSettings", "name": "selection"}, "name": "setting", "description": "The name of the setting to display or alter"}, {"defaultValue": null, "type": {"pointer": "settings:index#getTypeSpecFromAssignment", "name": "deferred"}, "name": "value", "description": "The new value for the chosen setting"}], "ep": "command", "name": "set"}, {"pointer": "commands#unsetCommand", "description": "unset a setting entirely", "params": [{"type": {"pointer": "settings:index#getSettings", "name": "selection"}, "name": "setting", "description": "The name of the setting to return to defaults"}], "ep": "command", "name": "unset"}], "type": "supported", "name": "settings"}, "appconfig": {"reloadURL": "/plugin/reload/appconfig", "resourceURL": "/plugin/file/supported/appconfig/resources/", "description": "Instantiates components and displays the GUI based on configuration.", "tiki:resources": [{"url": "/plugin/script/supported/appconfig/index.js", "type": "script", "id": "appconfig:index.js", "name": "index.js"}], "dependencies": {"jquery": "0.0.0", "canon": "0.0.0", "underscore": "0.0.0", "settings": "0.0.0"}, "testmodules": [], "provides": [{"description": "Event: Fired when the app is completely launched.", "ep": "extensionpoint", "name": "appLaunched"}], "type": "supported", "name": "appconfig"}, "syntax_worker": {"reloadURL": "/plugin/reload/syntax_worker", "resourceURL": "/plugin/file/supported/syntax_worker/resources/", "description": "Coordinates multiple syntax engines", "tiki:resources": [{"url": "/plugin/script/supported/syntax_worker/", "type": "script", "id": "syntax_worker:", "name": "index"}], "environments": {"worker": true}, "dependencies": {"syntax_directory": "0.0.0", "underscore": "0.0.0"}, "testmodules": [], "type": "supported", "name": "syntax_worker"}, "js_completion": {"reloadURL": "/plugin/reload/js_completion", "resourceURL": "/plugin/file/supported/js_completion/resources/", "description": "JavaScript code completion", "tiki:resources": [{"url": "/plugin/script/supported/js_completion/", "type": "script", "id": "js_completion:", "name": "index"}], "dependencies": {"completion": "0.0.0", "underscore": "0.0.0"}, "testmodules": [], "provides": [{"pointer": "#JSCompletion", "ep": "completion", "name": "js"}], "type": "supported", "name": "js_completion"}, "project": {"reloadURL": "/plugin/reload/project", "resourceURL": "/plugin/file/supported/project/resources/", "description": "Provides a \'project\' abstraction that sits atop the file system", "tiki:resources": [{"url": "/plugin/script/supported/project/commands.js", "type": "script", "id": "project:commands.js", "name": "commands.js"}, {"url": "/plugin/script/supported/project/index.js", "type": "script", "id": "project:index.js", "name": "index.js"}], "dependencies": {"filesystem": "0.0"}, "testmodules": [], "type": "supported", "name": "project"}, "notifier": {"reloadURL": "/plugin/reload/notifier", "resourceURL": "/plugin/file/supported/notifier/resources/", "description": "Provides a way to un-obtrusively notify users of asynchronous events", "tiki:resources": [{"url": "/plugin/script/supported/notifier/handlers.js", "type": "script", "id": "notifier:handlers.js", "name": "handlers.js"}, {"url": "/plugin/script/supported/notifier/index.js", "type": "script", "id": "notifier:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/notifier/tests/testNotifications.js", "type": "script", "id": "notifier:tests/testNotifications.js", "name": "tests/testNotifications.js"}], "dependencies": {"settings": "0.0.0"}, "testmodules": ["tests/testNotifications"], "provides": [{"action": "new", "pointer": "#Notifier", "ep": "factory", "name": "notifier"}, {"description": "tells the notifier about a kind of notification that may be presented to the user. This will be used in a notification configuration user interface, for example.", "unregister": "#unregisterNotification", "register": "#registerNotification", "params": [{"required": true, "type": "string", "name": "name", "description": "name of the notification type. Notifications are identified by the combination of pluginName_notificationName, so you don\'t need to worry about making this unique across Skywriter."}, {"type": "string", "name": "description", "description": "The more human-readable form of the notification name that will be presented to the user."}, {"type": "string", "name": "level", "description": "default level for these notifications. Value should be \'error\', \'info\' or \'debug\'."}, {"type": "pointer", "name": "onclick", "description": "function that should be called if one of these notifications is clicked on. Will be passed the message object."}, {"type": "resourceUrl", "name": "iconUrl", "description": "custom icon for this notification. looked up relative to the plugins resources directory."}], "ep": "extensionpoint", "name": "notification"}, {"description": "Debugging Messages", "level": "debug", "ep": "notification", "name": "debug"}, {"indexOn": "name", "description": "A function that is called with message objects whenever appropriate notifications are published.", "params": [{"required": true, "type": "string", "name": "name", "description": "convenient name for the handler (used in configuration)"}, {"type": "string", "name": "description", "description": "Longer, more human-readable description of the handler"}, {"required": true, "name": "pointer", "description": "function that will be called with the message"}], "ep": "extensionpoint", "name": "notificationHandler"}, {"description": "Logs to the browser console", "pointer": "handlers#console", "ep": "notificationHandler", "name": "console"}, {"description": "Displays in browser alerts", "pointer": "handlers#alert", "ep": "notificationHandler", "name": "alert"}, {"description": "JSON array of objects describing how notifications are configured", "defaultValue": "[]", "type": "text", "ep": "setting", "name": "notifications"}], "type": "supported", "name": "notifier"}, "filesystem": {"reloadURL": "/plugin/reload/filesystem", "resourceURL": "/plugin/file/supported/filesystem/resources/", "description": "Provides the file and directory model used within Skywriter", "tiki:resources": [{"url": "/plugin/script/supported/filesystem/index.js", "type": "script", "id": "filesystem:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/filesystem/path.js", "type": "script", "id": "filesystem:path.js", "name": "path.js"}, {"url": "/plugin/script/supported/filesystem/tests/fixture.js", "type": "script", "id": "filesystem:tests/fixture.js", "name": "tests/fixture.js"}, {"url": "/plugin/script/supported/filesystem/tests/testFileManagement.js", "type": "script", "id": "filesystem:tests/testFileManagement.js", "name": "tests/testFileManagement.js"}, {"url": "/plugin/script/supported/filesystem/tests/testPathUtils.js", "type": "script", "id": "filesystem:tests/testPathUtils.js", "name": "tests/testPathUtils.js"}, {"url": "/plugin/script/supported/filesystem/types.js", "type": "script", "id": "filesystem:types.js", "name": "types.js"}], "dependencies": {"types": "0.0"}, "testmodules": ["tests/testFileManagement", "tests/testPathUtils"], "provides": [{"action": "new", "pointer": "#Filesystem", "ep": "factory", "name": "files"}, {"description": "A pointer to a file which we believe to already exist", "pointer": "types#existingFile", "ep": "type", "name": "existingFile"}], "type": "supported", "name": "filesystem"}, "uicommands": {"reloadURL": "/plugin/reload/uicommands", "resourceURL": "/plugin/file/supported/uicommands/resources/", "description": "Commands for working with the Skywriter user interface beyond the editor", "tiki:resources": [{"url": "/plugin/script/supported/uicommands/", "type": "script", "id": "uicommands:", "name": "index"}], "testmodules": [], "provides": [{"predicates": {"isTextView": true}, "pointer": "#jumpCommandLine", "ep": "command", "key": "ctrl_j", "name": "jump-commandline"}, {"predicates": {"isKeyUp": false, "isCommandLine": true}, "pointer": "#jumpEditor", "ep": "command", "key": "ctrl_j", "name": "jump-editor"}], "type": "supported", "name": "uicommands"}, "skywriter_server": {"reloadURL": "/plugin/reload/skywriter_server", "resourceURL": "/plugin/file/supported/skywriter_server/resources/", "description": "Provides communication with the Skywriter Server", "tiki:resources": [{"url": "/plugin/script/supported/skywriter_server/commands.js", "type": "script", "id": "skywriter_server:commands.js", "name": "commands.js"}, {"url": "/plugin/script/supported/skywriter_server/filesource.js", "type": "script", "id": "skywriter_server:filesource.js", "name": "filesource.js"}, {"url": "/plugin/script/supported/skywriter_server/history.js", "type": "script", "id": "skywriter_server:history.js", "name": "history.js"}, {"url": "/plugin/script/supported/skywriter_server/index.js", "type": "script", "id": "skywriter_server:index.js", "name": "index.js"}, {"url": "/plugin/script/supported/skywriter_server/settings.js", "type": "script", "id": "skywriter_server:settings.js", "name": "settings.js"}, {"url": "/plugin/script/supported/skywriter_server/tests/testFileAccess.js", "type": "script", "id": "skywriter_server:tests/testFileAccess.js", "name": "tests/testFileAccess.js"}], "dependencies": {"project": "0.0", "settings": "0.0", "canon": "0.0", "filesystem": "0.0"}, "testmodules": ["tests/testFileAccess"], "provides": [{"action": "call", "pointer": "#createServer", "ep": "factory", "name": "skywriter_server"}, {"action": "new", "pointer": "filesource#SkywriterFileSource", "ep": "factory", "name": "skywriter_filesource"}, {"indexOn": "name", "ep": "extensionpoint", "name": "msgtargetid", "description": "Message target id to dispatch messages from the server"}, {"ep": "extensionpoint", "name": "mobwriteinstance", "description": "Optional mobwrite instance"}, {"pointer": "commands#rescanCommand", "description": "resynchronize the server\'s listing of your files. This is only in case you\'re having trouble. Usually you won\'t need this command.", "params": [{"type": "text", "name": "project", "description": "Project (top-level directory) to scan"}], "ep": "command", "name": "rescan"}, {"description": "Preview the current file.", "pointer": "commands#preview", "ep": "command", "key": "ctrl_p", "name": "preview"}, {"params": [{"type": "text", "name": "project", "description": "Project (top-level directory) to export"}, {"type": {"data": ["zip", "tgz", "tar.gz"], "name": "selection"}, "name": "archivetype", "description": "Type of archive to generate"}], "description": "export a project (top-level directory)", "pointer": "commands#exportCommand", "ep": "command", "name": "export"}], "type": "supported", "name": "skywriter_server"}}');
}, { auth: false });

/**
 * Hacked
 */
skyserver.addService('GET', /^\/plugin\/register\/boot$/, function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/javascript' });
  res.end('skywriter.tiki.register(\'::skywriter\', {"reloadURL": "/plugin/reload/skywriter", "resourceURL": "/plugin/file/boot/skywriter/resources/", "name": "skywriter", "tiki:resources": [{"url": "/plugin/script/boot/skywriter/builtins.js", "type": "script", "id": "skywriter:builtins.js", "name": "builtins.js"}, {"url": "/plugin/script/boot/skywriter/console.js", "type": "script", "id": "skywriter:console.js", "name": "console.js"}, {"url": "/plugin/script/boot/skywriter/globals.js", "type": "script", "id": "skywriter:globals.js", "name": "globals.js"}, {"url": "/plugin/script/boot/skywriter/index.js", "type": "script", "id": "skywriter:index.js", "name": "index.js"}, {"url": "/plugin/script/boot/skywriter/plugins.js", "type": "script", "id": "skywriter:plugins.js", "name": "plugins.js"}, {"url": "/plugin/script/boot/skywriter/promise.js", "type": "script", "id": "skywriter:promise.js", "name": "promise.js"}, {"url": "/plugin/script/boot/skywriter/proxy.js", "type": "script", "id": "skywriter:proxy.js", "name": "proxy.js"}, {"url": "/plugin/script/boot/skywriter/sandbox.js", "type": "script", "id": "skywriter:sandbox.js", "name": "sandbox.js"}, {"url": "/plugin/script/boot/skywriter/util/cookie.js", "type": "script", "id": "skywriter:util/cookie.js", "name": "util/cookie.js"}, {"url": "/plugin/script/boot/skywriter/util/scratchcanvas.js", "type": "script", "id": "skywriter:util/scratchcanvas.js", "name": "util/scratchcanvas.js"}, {"url": "/plugin/script/boot/skywriter/util/stacktrace.js", "type": "script", "id": "skywriter:util/stacktrace.js", "name": "util/stacktrace.js"}, {"url": "/plugin/script/boot/skywriter/util/util.js", "type": "script", "id": "skywriter:util/util.js", "name": "util/util.js"}], "environments": {"main": true, "worker": true}, "testmodules": [], "type": "boot"});');
  /*
  for item in c.plugin_path:
      if item["name"] == "boot":
          break

  if item["name"] != "boot":
      raise BadRequest("No boot code available")

  plugin_list = plugins.find_plugins([item])
  output = ""
  for plugin in plugin_list:
      output += """
%s.register('::%s', %s);
""" % (c.loader_name, plugin.name, simplejson.dumps(plugin.metadata))
  response.content_type = "text/javascript"
  response.body = output
  return response()
  */
}, { auth: false });

/**
 *
 */
skyserver.addService('GET', /^\/plugin\/register\/user$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  pluginInfo, project = get_user_plugin_info(request.user)
  path = get_user_plugin_path(request.user, plugin_info=pluginInfo, project=project)

  plugin_list = plugins.find_plugins(path)

  metadata = dict((plugin.name, plugin.metadata)
      for plugin in plugin_list)

  if pluginInfo is None:
      pluginInfo = dict(ordering=[], deactivated={});

  if request.user:
      log_event("userplugin", request.user, len(metadata))

  return _respond_json(response, dict({
      'metadata'   : metadata ,
      'ordering'   : pluginInfo.get("ordering", []),
      'deactivated': pluginInfo.get("deactivated", {})
  }));
  */
}, { auth: false });

/**
 *
 */
skyserver.addService('GET', /^\/plugin\/register\/tests$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  if "test_plugin_path" not in c:
      raise FileNotFound("Test plugins are only in development environment")
  return _plugin_response(response, c.test_plugin_path)
  */
}, { auth: false });

/**
 *
 */
skyserver.addService('GET', /^\/plugin\/register\/worker$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  return _plugin_response(response, environment='worker')
  */
}, { auth: false });


/**
 *
 */
skyserver.addService('GET', /^\/plugin\/script\/([^\/]+)\/([^\/]+)\/(.*)/, function(req, res) {
  var pluginLoc = req.matches[1];
  var pluginName = req.matches[2];
  var scriptPath = req.matches[3];

  if (pluginLoc.indexOf('..') !== -1 ||
      pluginName.indexOf('..') !== -1 ||
      scriptPath.indexOf('..') !== -1) {
    throw new Error('Bad request');
  }

  /**
  // Somewhere else ...
  var pluginPath = [
    { name: '...' }
  ];

  var path;
  pluginPath.forEach(function(pathEntry) {
    if (pathEntry.name === pluginLoc) {
      path = pathEntry;
    }
  }, this);

  if (!path) {
    throw new Error('Path not known: ' + pluginLoc);
  }
  */

  var source = path.join(pluginDir, pluginLoc, pluginName, scriptPath);
  var contents = fs.readFileSync(source, 'utf-8');

  res.writeHead(200, { 'Content-Type': 'text/javascript' });
  res.end(wrapScript(pluginName, scriptPath, contents));
}, { auth: false });


var loaderName = 'skywriter.tiki';

function wrapScript(pluginName, scriptPath, contents) {
  var moduleName = scriptPath ? scriptPath.split('/')[0] : 'index';

  return '; ' + loaderName + '.module(\'' + pluginName + ':' + moduleName +
      '\', function(require, exports, module) {' + contents + '\n;}); ' +
      loaderName + '.script(\'' + pluginName + ':' + scriptPath + '\');';
}

/**
 * TODO
 */
skyserver.addService('GET', /^\/plugin\/file\/([^\/]+)\/([^\/]+)\/(.*)/, function(req, res) {
  var pluginLoc = req.matches[1];
  var pluginName = req.matches[2];
  var scriptPath = req.matches[3];

  if (pluginLoc.indexOf('..') !== -1 ||
      pluginName.indexOf('..') !== -1 ||
      scriptPath.indexOf('..') !== -1) {
    throw new Error('Bad request');
  }

  /**
  var path;
  pluginPath.forEach(function(pathEntry) {
    if (pathEntry.name === pluginLoc) {
      path = pathEntry;
    }
  }, this);

  if (!path) {
    throw new Error('Path not known: ' + pluginLoc);
  }
  */

  var source = path.join(pluginDir, pluginLoc, pluginName, scriptPath);
  var stat = fs.statSync(source);
  paperboy.streamFile(source, [], stat, res, req);
}, { auth: false });

/**
 *
 */
skyserver.addService('GET', /^\/plugin\/reload\/(.+)/, function(req, res) {
  throw new Error('Not implemented');
  /*
  plugin_name = request.kwargs['plugin_name']
  if ".." in plugin_name:
      raise BadRequest("'..' not allowed in plugin names")
  if request.user:
      path = get_user_plugin_path(request.user)
  else:
      path = []
  path.extend(c.plugin_path)

  plugin = plugins.lookup_plugin(plugin_name, path)

  if plugin is None:
      return _plugin_does_not_exist(response, plugin_name)

  return _plugin_response(response, plugin_list=[plugin])
  */
}, { auth: false });

/**
 *
 */
skyserver.addService('POST', /^\/plugin\/upload\/(.+)/, function(req, res) {
  throw new Error('Not implemented');
  /*
  plugin_name = request.kwargs['plugin_name']
  if ".." in plugin_name:
      raise BadRequest("'..' not allowed in plugin names")
  path = get_user_plugin_path(request.user, include_installed=False)
  plugin = plugins.lookup_plugin(plugin_name, path)
  if not plugin:
      raise plugins.PluginError("Cannot find plugin '%s' among user editable plugins" % plugin_name)
  if plugin.location_name != "user":
      raise BadRequest("Only user-editable plugins can be uploaded")
  plugins.save_to_gallery(request.user, plugin.location)
  response.content_type = "text/plain"
  response.body = "OK"
  return response()
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/plugin\/gallery\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  plugins = GalleryPlugin.get_all_plugins()
  result = []
  for p in plugins:
      data = dict(name=p.name,
                  description=p.package_info.get('description', ""))
      result.append(data)
  return _respond_json(response, result)
  */
});

/**
 *
 */
skyserver.addService('GET', /^\/plugin\/templates\/(.*)\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  plugin_name = request.kwargs['plugin_name'] if ".." in plugin_name: raise BadRequest("'..' not allowed in plugin names") if request.user: path = get_user_plugin_path(request.user) else: path = [] path.extend(c.plugin_path) plugin = plugins.lookup_plugin(plugin_name, path) if plugin is None: return _plugin_does_not_exist(response, plugin_name) template_module = plugin.template_module if not template_module: raise FileNotFound("Plugin %s has no templates" % plugin_name) response.content_type = "text/javascript" response.body = _wrap_script(plugin_name, "templates", template_module) return response()
  */
}, { auth: false });

/*
class FileIterable(object):
    def __init__(self, filename):
        self.filename = filename
    def __iter__(self):
        return FileIterator(self.filename)
class FileIterator(object):
    chunk_size = 4096
    def __init__(self, filename):
        self.filename = filename
        self.fileobj = open(self.filename, 'rb')
    def __iter__(self):
        return self
    def next(self):
        chunk = self.fileobj.read(self.chunk_size)
        if not chunk:
            raise StopIteration
        return chunk
*/

/**
 *
 */
skyserver.addService('GET', /^\/plugin\/download\/([^\/]+)\/current\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  plugin_name = request.kwargs['plugin_name']
  plugin = GalleryPlugin.get_plugin(plugin_name)
  if plugin is None:
      raise FileNotFound("Plugin %s is not in the gallery" % (plugin_name))
  location = plugin.get_path()
  if location.endswith(".zip"):
      response.content_type = "application/zip"
  else:
      response.content_type = "text/javascript"

  response.app_iter = FileIterable(location)
  response.content_length = os.path.getsize(location)
  response.last_modified = os.path.getmtime(location)
  response.etag = '%s-%s-%s' % (response.last_modified,
                            response.content_length, hash(location))
  return response()
  */
}, { auth: false });

/*
def _wrap_script(plugin_name, script_path, script_text):
    if script_path:
        module_name = os.path.splitext(script_path)[0]
    else:
        module_name = "index"

    return """; %s.module('%s:%s', function(require, exports, module) {%s
;}); %s.script('%s:%s');""" % (c.loader_name, plugin_name, module_name,
        script_text, c.loader_name, plugin_name, script_path)

urlmatch = re.compile(r'^(http|https)://')
*/

/**
 *
 */
skyserver.addService('POST', /^\/plugin\/install\/$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  """Installs a plugin into the user's SkywriterSettings/plugins directory."""
  user = request.user
  url = request.POST.get('url')

  plugin_name = request.POST.get('pluginName')

  if not url or not urlmatch.search(url):
      raise BadRequest("URL not provided")

  if plugin_name and ("/" in plugin_name or ".." in plugin_name):
      raise BadRequest("Invalid plugin name. / and .. are not permitted")

  tempdatafile = _download_data(url, request)
  settings_project = get_project(user, user, "SkywriterSettings")
  path_entry = dict(name="user", chop=len(user.get_location()))
  plugin = plugins.install_plugin(tempdatafile, url, settings_project,
                                  path_entry, plugin_name)
  tempdatafile.close()

  plugin_collection = dict()
  plugin_collection[plugin.name] = plugin.metadata
  response.body = simplejson.dumps(plugin_collection)
  response.content_type = "application/json"
  return response()
  */
});

/**
 *
 */
skyserver.addService('POST', /^\/plugin\/install\/(.+)$/, function(req, res) {
  throw new Error('Not implemented');
  /*
  plugin_name = request.kwargs["name"]
  data = plugins.install_plugin_from_gallery(request.user, plugin_name)
  return _respond_json(response, data)
  */
});


/**
 *
 */
skyserver.listen(8124, "127.0.0.1");

