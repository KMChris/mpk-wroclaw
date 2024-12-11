from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/mpk/api', methods=['GET'])
def proxy():
    url = 'https://www.wroclaw.pl/open-data/api/3/action/datastore_search'
    params = {
        'resource_id': '17308285-3977-42f7-81b7-fdd168c210a2',
        'filters': request.args.get('filters', '{}')
    }
    headers = {
        'Content-Type': 'application/json'
    }
    response = requests.get(url, params=params, headers=headers)
    return jsonify(response.json()['result']['records'])

if __name__ == '__main__':
    app.run(port=5000, host='0.0.0.0')
