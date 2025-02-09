import Fastify from 'fastify'

let users = [
	{
		id: 0,
		name: "Alice Johnson",
		phoneNumber: "+380931013399",
		email: "alice.johnson@example.com",
	},
	{
		id: 1,
		name: "Bob Smith",
		phoneNumber: "+380931013400",
		email: "bob.smith@example.com",
	},
	{
		id: 2,
		name: "Charlie Brown",
		phoneNumber: "+380931013401",
		email: "charlie.brown@example.com",
	},
	{
		id: 3,
		name: "Diana Prince",
		phoneNumber: "+380931013402",
		email: "diana.prince@example.com",
	},
	{
		id: 4,
		name: "Ethan Hunt",
		phoneNumber: "+380931013403",
		email: "ethan.hunt@example.com",
	}
]

const fastify = Fastify({
	logger: {
		transport: {
			target: 'pino-pretty',
		},
	},
})

fastify.decorate('role', 'nobody')

fastify.decorate('auth', async (request, reply) => {
	const { authorization } = request.headers
	
	if (authorization) {
		const decodedAuthInfo = Buffer.from(authorization.split(' ')[1], "base64").toString('utf8')
		
		if (decodedAuthInfo === 'admin:admin') {
			fastify.role = 'admin'
		} else if (decodedAuthInfo === 'user:user') {
			fastify.role = 'user'
		} else
			fastify.role = 'nobody'
		
	} else {
		fastify.role = 'nobody'
	}
})

fastify.addHook('preHandler', async (request, reply) => {
	await fastify.auth(request, reply)
})

let nextId = Math.max(...users.map(user => user.id)) + 1

const jsonType = 'application/json; charset=utf-8'

fastify.get('/users', async (request, reply) => {
	return reply
		.type(jsonType)
		.code(200)
		.send(users)
})

fastify.get('/users/:id', async (request, reply) => {
	const { id } = request.params
	
	const user = users.find(user => user.id === +id)
	
	if (!user) {
		return reply
			.type(jsonType)
			.code(404)
			.send({ error: 'User not found' })
	}
	
	return reply
		.type(jsonType)
		.code(200)
		.send(user)
});

fastify.post('/users', async (request, reply) => {
	const { name, phoneNumber, email } = request.body
	
	const newUser = {
		id: nextId++,
		name: name,
		phoneNumber: phoneNumber,
		email: email,
	}
	
	users = [...users, newUser]
	
	return reply
		.type(jsonType)
		.code(201)
		.send(newUser)
});

fastify.patch('/users/:id', async (request, reply) => {
	if (!(fastify.role === 'user') && !(fastify.role === 'admin'))
		return reply
			.type(jsonType)
			.code(403)
			.send({ error: 'Forbidden' })
	
	const { id } = request.params
	
	const index = users.findIndex(user => user.id === +id)
	
	if (index === -1) {
		return reply
			.type(jsonType)
			.code(404)
			.send({ error: 'User not found' })
	}
	
	users = users.map(user => {
		if (user.id === +id) {
			return {
				...user,
				...request.body
			}
		}
		return user
	});
	
	return reply
		.type(jsonType)
		.code(200)
		.send(users[index])
});

fastify.delete('/users/:id', async (request, reply) => {
	if (!(fastify.role === 'admin'))
		return reply
			.type(jsonType)
			.code(403)
			.send({ error: 'Forbidden' })
	
	const { id } = request.params
	
	const index = users.findIndex(user => user.id === +id)
	
	if (index === -1) {
		return reply
			.type(jsonType)
			.code(404)
			.send({ error: 'User not found' })
	}
	
	users.filter(user => user.id !== +id)
	
	return reply
		.code(204)
		.send()
});

fastify.listen(
	{
		port: 8080,
		host: '127.0.0.1',
	},
	(err, address) => {
		fastify.log.error(err, address)
	}
)
