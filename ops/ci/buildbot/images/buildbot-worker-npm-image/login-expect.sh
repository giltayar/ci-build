set timeout 20

set username [lindex $argv 0]
set password [lindex $argv 1]

spawn npm login

expect "Username: "
send "$username\r";

expect "Password: "
send "$password\r";

expect "Email: (this IS public) "
send "\r";

expect eof

puts $expect_out(buffer)
