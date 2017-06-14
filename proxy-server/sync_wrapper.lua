local session_res = ngx.location.capture("/_session")

if session_res.status == ngx.HTTP_OK then
  local session = json.decode(session_res.body)

  local user_res = ngx.location.capture("/_users/org.couchdb.user:" .. session.userCtx.name)

  if user_res.status == ngx.HTTP_OK then
    local user = json.decode(user_res.body)

    local args = ngx.req.get_uri_args()
    args.filter = "_selector"
    ngx.req.set_uri_args(args)

    ngx.req.read_body()
    local oldbody = ngx.req.get_body_data()

    local newbody = string.sub(oldbody, 0, #oldbody-1)
    newbody = newbody..',"selector":{ "_id": { "$regex": "^'.. user.profileId ..'" }}}'

    --newbody = newbody..',"selector":{ "_id": "a"} }'

    --ngx.log(ngx.ERR, newbody)

    ngx.req.set_body_data(newbody)
    --ngx.req.set_uri("/main/_changes")
    return
  end
  ngx.exit(user_res.status)

end

ngx.exit(session_res.status)
