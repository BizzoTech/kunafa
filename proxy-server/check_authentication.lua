local session_res = ngx.location.capture("/_session")

if session_res.status == ngx.HTTP_OK then

  return
end

ngx.exit(session_res.status)
