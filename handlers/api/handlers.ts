import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { sign } from 'jsonwebtoken'

export const handlerTest = async (event: any, _context: Context): Promise<any> => {
    console.log(event)
    console.log(_context)
    switch (event.path) {
        case '/v1/auth':
            const token = getAuthToken(event)
            console.log(token)
            const outputAuth = outputStandard(token)
            return outputAuth
            break;
    
        default:
            const output = outputDefault()
            return output
            break;
    }
    
}


function getAuthToken(event: any) {
    const jwtSecret = getJwtSecret()
    const headers = event.headers
    const returnData = {User: headers.User}
    const token = sign({ data: returnData, expiresIn: '10m' }, jwtSecret)
    return token
}

function outputStandard(token: string) {
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/plain'
        },
        'body': token
    }
}

function getJwtSecret() {
    return 'shhhhh'
}

function outputDefault() {
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/plain'
        },
        'body': 'Hello, CDK!'
    }
}
